import { select } from '@angular-redux/store';
import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Observable } from 'rxjs/Observable';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs/Subject';

import { DevicesActions } from '../../store/ble-devices/actions';
import { BLEDevice } from '../../store/ble-devices/models';
import { DeviceState } from '../../store/ble-devices/reducer';

@Component({
  selector: 'page-devices',
  templateUrl: 'devices.html'
})
export class DevicesPage {
  @select() readonly bleDevices$: Observable<DeviceState>;

  devices: DeviceState;
  foundDevices: BLEDevice[] = [];
  onDestroy$ = new Subject<void>();

  constructor(public navCtrl: NavController, public navParams: NavParams, private deviceActions: DevicesActions) {}

  ionViewDidLoad() {
    this.bleDevices$.pipe(takeUntil(this.onDestroy$)).subscribe((state: DeviceState) => {
      this.devices = state;
      this.foundDevices = state.foundDevices;
    });
  }

  ionViewWillUnload() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  connect(device: BLEDevice) {
    if (this.devices.connectingDevice === null) {
      // this.deviceActions.connectDevice(device);
      this.deviceActions.autoConnectDevice(device);
    }
  }

  disconnect(device: BLEDevice) {
    this.deviceActions.disconnectDevice(device);
  }

  isCurrentDevice(device: BLEDevice) {
    const { connectedDevice } = this.devices;
    return connectedDevice && connectedDevice.id === device.id;
  }

  isConnectingDevice(device: BLEDevice) {
    const { connectingDevice } = this.devices;
    return connectingDevice && connectingDevice.id === device.id;
  }
}
