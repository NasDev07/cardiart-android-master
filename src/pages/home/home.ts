import { select } from '@angular-redux/store';
import { Component } from '@angular/core';
import { BarcodeScanner, BarcodeScannerOptions } from '@ionic-native/barcode-scanner';
import { TranslateService } from '@ngx-translate/core';
import { App, NavController, Platform } from 'ionic-angular';
import { Observable } from 'rxjs/Observable';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs/Subject';

import { UIProvider } from '../../providers/ui/ui';
import { UtilProvider } from '../../providers/util/util';
import { AppProvider } from './../../providers/app/app';
import { DevicesActions } from '../../store/ble-devices/actions';
import { BLEDevice } from '../../store/ble-devices/models';
import { DeviceState } from '../../store/ble-devices/reducer';
import { PatientActions } from '../../store/patient/actions';
import { PatientState } from '../../store/patient/reducer';
import { RecordsActions } from '../../store/records/actions';
import { Record } from '../../store/records/models';
import { RecordsState } from '../../store/records/reducer';
import { SettingsActions } from '../../store/settings/actions';
import { SettingsState } from '../../store/settings/reducer';
import { DevicesPage } from '../devices/devices';
import { ExaminationPage } from '../examination/examination';
import { PatientPage } from '../patient/patient';
import { RecordsPage } from '../records/records';
import { SettingsPage } from '../settings/settings';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {
  @select() readonly patient$: Observable<PatientState>;
  @select() readonly bleDevices$: Observable<DeviceState>;
  @select() readonly records$: Observable<RecordsState>;
  @select() readonly settings$: Observable<SettingsState>;

  devices: DeviceState;
  patientState: PatientState;
  settingsState: SettingsState;

  currectDevice: BLEDevice;
  records: Record[];
  t: any;
  unregBackCall: any;
  canGoBack = true;
  onDestroy$ = new Subject<void>();

  constructor(
    public app: App,
    public platform: Platform,
    public navCtrl: NavController,
    private translate: TranslateService,
    private barcodeScanner: BarcodeScanner,
    private patientActions: PatientActions,
    private devicesActions: DevicesActions,
    private settingsActions: SettingsActions,
    private recordsActions: RecordsActions,
    private uiProvider: UIProvider,
    private util: UtilProvider,
    private appProvider: AppProvider
  ) {
    this.translate
      .get([
        'COMMON.OK',
        'DEVICES.FAILED_TO_CONNECT',
        'DEVICES.BT_DISABLED',
        'BARCODE.PROMPT_MESSAGE',
        'BARCODE.BARCODE_LIMITATION',
        'BARCODE.BARCODE_NOT_SUPPORT',
        'BARCODE.BARCODE_FORMAT_NOT_CORRECT',
        'MESSAGES.SERIAL_NUMBER_MAX_LENGTH',
        'SETTINGS.OFF',
        'SETTINGS.HP',
        'SETTINGS.LP',
        'SETTINGS.AC'
      ])
      .subscribe((res: string) => {
        this.t = res;
      });
    this.patient$.pipe(takeUntil(this.onDestroy$)).subscribe((state: PatientState) => {
      this.patientState = { ...state };
    });
    this.bleDevices$.pipe(takeUntil(this.onDestroy$)).subscribe((state: DeviceState) => {
      this.devices = state;
      this.currectDevice = state.connectedDevice;

      if (this.devices.isConnectFailed) {
        this.uiProvider.presentToast(this.t['DEVICES.FAILED_TO_CONNECT']);
      }
      if (!this.devices.isEnabled) {
        this.uiProvider.presentToast(this.t['DEVICES.BT_DISABLED']);
      }
    });
    this.records$.pipe(takeUntil(this.onDestroy$)).subscribe((state: RecordsState) => {
      this.records = state.records;
    });
    this.settings$.pipe(takeUntil(this.onDestroy$)).subscribe((state: SettingsState) => {
      this.settingsState = state;
    });
    this.recordsActions.getRecords();
    this.settingsActions.getSettings();
    this.patientActions.getProfile();
  }

  ionViewDidLoad() {
    this.devicesActions.initialize();
  }

  ionViewWillEnter() {
    this.unregBackCall = this.platform.registerBackButtonAction(() => {
      let nav = this.app.getActiveNav();
      if (nav.canGoBack()) {
        nav.pop();
      } else {
        const canGoBack = this.canGoBack;
        this.canGoBack = true;
        if (!canGoBack) return;

        this.devicesActions.uninitialize().then(() => {
          this.platform.exitApp();
        });
      }
    });
  }

  ionViewWillLeave() {
    this.unregBackCall && this.unregBackCall();
  }

  ionViewWillUnload() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  goPatient() {
    this.navCtrl.push(PatientPage);
  }

  goExamination() {
    this.navCtrl.push(ExaminationPage);
  }

  goDevices() {
    this.navCtrl.push(DevicesPage);
  }

  goRecords() {
    this.navCtrl.push(RecordsPage);
  }

  goSettings() {
    this.navCtrl.push(SettingsPage);
  }

  getSettingsInfo() {
    if (!this.settingsState) return null;

    let str = '';
    if (this.settingsState.highPassFilter !== '0') {
      str += `${this.t['SETTINGS.HP']}${this.settingsState.highPassFilter}Hz`;
    } else {
      str += `${this.t['SETTINGS.HP']}${this.t['SETTINGS.OFF']}`;
    }
    if (this.settingsState.lowPassFilter !== '0') {
      str += ` ${this.t['SETTINGS.LP']}${this.settingsState.lowPassFilter}Hz`;
    } else {
      str += ` ${this.t['SETTINGS.LP']}${this.t['SETTINGS.OFF']}`;
    }
    if (this.settingsState.ACNotchFilter !== '0') {
      str += ` ${this.t['SETTINGS.AC']}${this.settingsState.ACNotchFilter}Hz`;
    } else {
      str += ` ${this.t['SETTINGS.AC']}${this.t['SETTINGS.OFF']}`;
    }
    // if (this.settingsState.EMGFilter) {
    //   str += ` ${this.t['SETTINGS.EMG']}ON`;
    // } else {
    //   str += ` ${this.t['SETTINGS.EMG']}${this.t['SETTINGS.OFF']}`;
    // }
    return str;
  }

  scanBarcode() {
    this.canGoBack = false;
    const options: BarcodeScannerOptions = {
      showTorchButton: true,
      prompt: this.t['BARCODE.PROMPT_MESSAGE']
    };
    this.barcodeScanner
      .scan(options)
      .then(barcodeData => {
        if (barcodeData.cancelled || barcodeData.text.length === 0) return;

        if (barcodeData.format !== 'QR_CODE' && barcodeData.format !== 'CODE_39' && barcodeData.format !== 'CODE_128') {
          this.uiProvider.showAlert(
            this.t['BARCODE.BARCODE_NOT_SUPPORT'],
            this.t['BARCODE.BARCODE_FORMAT_NOT_CORRECT']
          );
        } else if (barcodeData.text.length > 20 || !this.util.isASCII(barcodeData.text)) {
          this.uiProvider.showAlert(this.t['BARCODE.BARCODE_LIMITATION'], this.t['BARCODE.BARCODE_FORMAT_NOT_CORRECT']);
        } else {
          this.patientState.sn = barcodeData.text;
          this.patientActions.saveProfile(this.patientState);
        }
      })
      .catch(err => {
        this.appProvider.printAndWriteErrorLog(err);
      });
  }
}
