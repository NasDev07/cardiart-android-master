import { NgRedux } from '@angular-redux/store';
import { Injectable } from '@angular/core';
import { BLE } from '@ionic-native/ble';
import { Storage } from '@ionic/storage';
import { TranslateService } from '@ngx-translate/core';
import { AlertController, Platform } from 'ionic-angular';
import { TextDecoder } from 'text-encoding';

import { AppProvider } from '../../providers/app/app';
import { IAppState } from '../../store';
import { BLEDevice } from './models';

declare var ble: any;

@Injectable()
export class DevicesActions {
  bluetoothEnabled: boolean;
  private t: any;

  constructor(
    public platform: Platform,
    private ngRedux: NgRedux<IAppState>,
    private translate: TranslateService,
    private storage: Storage,
    private alertCtrl: AlertController,
    private ble: BLE,
    private appProvider: AppProvider
  ) {
    this.translate.get(['COMMON.OK', 'MESSAGES.ENABLE_LOCATION_SERVICE']).subscribe((res: string) => {
      this.t = res;
    });
  }

  static SCAN_DEVICES = 'SCAN_DEVICES';
  static SCAN_DEVICES_DONE = 'SCAN_DEVICES_DONE';
  static FOUND_DEVICES = 'FOUND_DEVICES';
  static CONNECT_DEVICE = 'CONNECT_DEVICE';
  static DEVICE_CONNECTED = 'DEVICE_CONNECTED';
  static DEVICE_DISCONNECTED = 'DEVICE_DISCONNECTED';
  static DEVICE_CONNECT_FAILED = 'DEVICE_CONNECT_FAILED';
  static DEVICE_RECONNECTING = 'DEVICE_RECONNECTING';
  static BT_STATUS = 'BT_STATUS';
  static IS_BT5_SUPPORTED = 'IS_BT5_SUPPORTED';
  static DEVICE_FW_VERSION = 'DEVICE_FW_VERSION';

  async initialize() {
    this.ble.startStateNotifications().subscribe(state => {
      this.appProvider.printAndWriteDebugLog('Bluetooth state changed to: ' + state);
      this.btStateHandle(state);
    });
  }

  async uninitialize() {
    await this.stopScanDevices();
    await this.ble.stopStateNotifications();
    const connectedDeivce = this.ngRedux.getState().bleDevices.connectedDevice;
    if (connectedDeivce) {
      await this.ble.disconnect(connectedDeivce.id);
    }
  }

  async isBTEnabled() {
    let enabled = false;
    try {
      await this.ble.isEnabled();
      enabled = true;
    } catch (err) {
      enabled = false;
    }
    return enabled;
  }

  async btStateHandle(state: string) {
    let btIsEnabled = false;
    if (state === 'on') {
      btIsEnabled = true;
    } else if (state === 'off') {
      btIsEnabled = false;
    }
    if (this.bluetoothEnabled !== btIsEnabled) {
      if (btIsEnabled) {
        this.isBT5Supported();
        this.scanDevices();
      } else {
        this.stopScanDevices();
      }
      this.ngRedux.dispatch({
        type: DevicesActions.BT_STATUS,
        btIsEnabled
      });
    }
    this.bluetoothEnabled = btIsEnabled;
  }

  /**
   * Scan and discover BLE peripherals for the specified amount of time.
   *
   * @param {number} milliseconds  Number of seconds to run discovery
   * @memberof DevicesActions
   */
  async scanDevices(milliseconds: number = 0) {
    const btIsEnabled = await this.isBTEnabled();
    if (btIsEnabled) {
      const lastConnectedDevice = await this.storage.get('last_connected_device');
      await this.appProvider.printAndWriteDebugLog('lastConnectedDevice: ' + JSON.stringify(lastConnectedDevice));

      this.ngRedux.dispatch({ type: DevicesActions.SCAN_DEVICES });

      this.ble.startScan([]).subscribe(
        device => {
          if (device.name && device.name.startsWith('12ECG')) {
            this.ngRedux.dispatch({
              type: DevicesActions.FOUND_DEVICES,
              device
            });

            if (lastConnectedDevice && device.id === lastConnectedDevice.id) {
              this.ble
                .isConnected(device.id)
                .then(() => {})
                .catch(() => {
                  this.autoConnectDevice(device);
                });
            }
          }
        },
        (error: string) => {
          this.appProvider.printAndWriteErrorLog(error);
          if (error === 'Location Services are disabled') {
            const confirm = this.alertCtrl.create({
              title: this.t['MESSAGES.ENABLE_LOCATION_SERVICE'],
              buttons: [
                {
                  text: this.t['COMMON.OK'],
                  handler: () => {
                    this.platform.exitApp();
                  }
                }
              ]
            });
            confirm.present();
          }
        }
      );

      if (milliseconds !== 0) {
        setTimeout(() => {
          this.stopScanDevices();
        }, milliseconds);
      }
    }
  }

  async stopScanDevices() {
    await this.ble.stopScan();
    this.ngRedux.dispatch({
      type: DevicesActions.SCAN_DEVICES_DONE
    });
  }

  async connectDevice(device: BLEDevice) {
    const btIsEnabled = await this.isBTEnabled();
    if (btIsEnabled) {
      this.ngRedux.dispatch({
        type: DevicesActions.CONNECT_DEVICE,
        device
      });

      this.ble.connect(device.id).subscribe(
        peripheral => {
          this.appProvider.printAndWriteDebugLog(`Connected to ${peripheral.id}`);
          this.ngRedux.dispatch({
            type: DevicesActions.DEVICE_CONNECTED,
            device
          });

          this.getFWVersion(peripheral.id);
        },
        peripheral => {
          this.appProvider.printAndWriteDebugLog(`Disconnected from ${peripheral.id}`);
          this.ngRedux.dispatch({
            type: DevicesActions.DEVICE_DISCONNECTED
          });
        }
      );
    }
  }

  async autoConnectDevice(device: BLEDevice) {
    const btIsEnabled = await this.isBTEnabled();
    if (btIsEnabled) {
      this.ngRedux.dispatch({
        type: DevicesActions.CONNECT_DEVICE,
        device
      });

      this.ble.autoConnect(
        device.id,
        peripheral => {
          this.appProvider.printAndWriteDebugLog(`Connected to ${peripheral.id}`);
          this.storage.set('last_connected_device', device);
          this.ngRedux.dispatch({
            type: DevicesActions.DEVICE_CONNECTED,
            device
          });

          this.getFWVersion(peripheral.id);
        },
        peripheral => {
          this.appProvider.printAndWriteDebugLog(`Disconnected from ${peripheral.id}`);
          this.ngRedux.dispatch({
            type: DevicesActions.DEVICE_RECONNECTING
          });
        }
      );
    }
  }

  disconnectDevice(device: BLEDevice) {
    this.ble.disconnect(device.id).then(
      () => {
        this.appProvider.printAndWriteDebugLog('Disconnected ' + device.id);
        this.ngRedux.dispatch({ type: DevicesActions.DEVICE_DISCONNECTED });
      },
      () => this.appProvider.printAndWriteErrorLog('ERROR disconnecting ' + device.id)
    );
  }

  notify(deviceId: string, serviceUUID: string, characteristicUUID: string) {
    return this.ble.startNotification(deviceId, serviceUUID, characteristicUUID);
  }

  write(deviceId: string, serviceUUID: string, characteristicUUID: string, data: ArrayBuffer) {
    return this.ble.write(deviceId, serviceUUID, characteristicUUID, data);
  }

  async isBT5Supported() {
    ble.withPromises.isBT5Supported().then(
      () => {
        const isBT5Supported = true;
        this.ngRedux.dispatch({
          type: DevicesActions.IS_BT5_SUPPORTED,
          isBT5Supported
        });
      },
      msg => {
        const isBT5Supported = false;
        this.ngRedux.dispatch({
          type: DevicesActions.IS_BT5_SUPPORTED,
          isBT5Supported
        });
      }
    );
  }

  async getFWVersion(deviceId: string) {
    const ab = await this.ble.read(deviceId, '180a', '2a26');
    const version = new TextDecoder('utf-8').decode(ab);
    this.ngRedux.dispatch({
      type: DevicesActions.DEVICE_FW_VERSION,
      version
    });
  }
}
