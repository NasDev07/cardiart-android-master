import { select } from '@angular-redux/store';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { AppVersion } from '@ionic-native/app-version';
import { TranslateService } from '@ngx-translate/core';
import { NavController, NavParams } from 'ionic-angular';
import 'rxjs/add/operator/map';
import { Observable } from 'rxjs/Observable';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs/Subject';

import { AppProvider } from '../../providers/app/app';
import { UIProvider } from '../../providers/ui/ui';
import { DeviceState } from '../../store/ble-devices/reducer';
import { PyBridgeActions } from '../../store/pybridge/actions';
import { SettingsActions } from '../../store/settings/actions';
import { SettingsState } from '../../store/settings/reducer';
import { SubSettingsPage } from './subsettings';

@Component({
  selector: 'page-settings',
  templateUrl: 'settings.html'
})
export class SettingsPage {
  @select() readonly bleDevices$: Observable<DeviceState>;
  @select() readonly settings$: Observable<SettingsState>;

  settingsState: SettingsState;

  ecgModuleVersion: Promise<string>;
  appVersion: string;
  onDestroy$ = new Subject<void>();
  t: string;
  filter: any;
  clickCount = 0;
  isDevMode: boolean = false;
  isDebugEnabled: boolean = false;
  deviceVersion: string;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private translate: TranslateService,
    private http: HttpClient,
    private appVersionPlugin: AppVersion,
    private settingsActions: SettingsActions,
    private pyBridgeActions: PyBridgeActions,
    private appProvider: AppProvider,
    private uiProvider: UIProvider
  ) {
    this.appVersionPlugin.getVersionNumber().then(version => {
      this.appVersion = version;
    });
    this.translate
      .get([
        'SETTINGS.ECG_REPORT_SETTINGS',
        'SETTINGS.MINNESOTA_CODE',
        'SETTINGS.HIGH_PASS_FILTER',
        'SETTINGS.LOW_PASS_FILTER',
        'SETTINGS.AC_NOTCH_FILTER',
        'SETTINGS.EMG_FILTER',
        'SETTINGS.ECG_MODULE_VERSION',
        'SETTINGS.APP_VERSION',
        'SETTINGS.OFF',
        'COMMON.ENABLE_DEBUG_MODE'
      ])
      .subscribe((res: string) => {
        this.t = res;
      });
    this.http.get('assets/filter.json').subscribe((data: any) => {
      this.filter = data.filterOptions;
    });
    this.ecgModuleVersion = this.pyBridgeActions.ecgModuleVersion;
  }

  ionViewDidLoad() {
    this.bleDevices$.pipe(takeUntil(this.onDestroy$)).subscribe((state: DeviceState) => {
      this.deviceVersion = state.deviceVersion;
    });
    this.settings$.pipe(takeUntil(this.onDestroy$)).subscribe((state: SettingsState) => {
      this.settingsState = state;
    });
    this.appProvider.isDevMode().then((value: boolean) => {
      this.isDevMode = value;
    });
    this.appProvider.isDebugEnabled().then(value => {
      this.isDebugEnabled = value;
    });
  }

  ionViewWillUnload() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  changeLang(title: string) {
    return !title || title === '0' ? this.t['SETTINGS.OFF'] : `${title}Hz`;
  }

  select(group: number, id?: number) {
    if (group === 0) {
      this.navCtrl.push(SubSettingsPage, {
        group: group
      });
    } else {
      const filter = this.filter.filter(item => {
        return item.id === id;
      })[0];

      switch (filter.id) {
        case 0:
          filter.name = this.t['SETTINGS.HIGH_PASS_FILTER'];
          break;
        case 1:
          filter.name = this.t['SETTINGS.LOW_PASS_FILTER'];
          break;
        case 2:
          filter.name = this.t['SETTINGS.AC_NOTCH_FILTER'];
          break;
      }

      this.navCtrl.push(SubSettingsPage, {
        group: group,
        filter: filter
      });
    }
  }

  onChange(event: boolean) {
    this.settingsState.EMGFilter = event;
    this.settingsActions.saveSettings(this.settingsState);
  }

  async triggerDebugMode() {
    if (!this.isDevMode) return;

    if (++this.clickCount >= 10) {
      await this.appProvider.setDebugMode(true);
      this.isDebugEnabled = await this.appProvider.isDebugEnabled();
      this.uiProvider.presentToast(this.t['COMMON.ENABLE_DEBUG_MODE']);
    }
  }
}
