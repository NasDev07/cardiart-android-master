import { select } from '@angular-redux/store';
import { Component } from '@angular/core';
import { Insomnia } from '@ionic-native/insomnia';
import { Intent, WebIntent } from '@ionic-native/web-intent';
import { ScreenOrientation } from '@ionic-native/screen-orientation';
import { SplashScreen } from '@ionic-native/splash-screen';
import { StatusBar } from '@ionic-native/status-bar';
import { File } from '@ionic-native/file';
import { MobileAccessibility } from '@ionic-native/mobile-accessibility';
import { Device } from '@ionic-native/device';
import { TranslateService } from '@ngx-translate/core';
import { Platform } from 'ionic-angular';
import { Observable } from 'rxjs/Observable';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs/Subject';
import * as moment from 'moment';

import { HomePage } from '../pages/home/home';
import { LandingPage } from '../pages/landing/landing';
import { DatabaseProvider } from '../providers/database/database';
import { FileUtilProvider } from '../providers/util/fileUtil';
import { AppProvider } from './../providers/app/app';
import { PyBridgeActions } from '../store/pybridge/actions';
import { PatientActions } from '../store/patient/actions';
import { IntentActions } from '../store/intent/actions';
import { PyBridgeState } from '../store/pybridge/reducer';
import * as AppConstant from '../constants/app';

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  @select() readonly pyBridge$: Observable<PyBridgeState>;

  rootPage: any = LandingPage;
  initStart: number;
  // The time for state ready
  waitTime: number = 1500;
  onDestroy$ = new Subject<void>();

  constructor(
    public platform: Platform,
    public statusBar: StatusBar,
    public splashScreen: SplashScreen,
    private insomnia: Insomnia,
    private webIntent: WebIntent,
    private mobileAccessibility: MobileAccessibility,
    private file: File,
    private device: Device,
    private translate: TranslateService,
    private pyBridgeActions: PyBridgeActions,
    private patientActions: PatientActions,
    private intentActions: IntentActions,
    private screenOrientation: ScreenOrientation,
    private dbProvider: DatabaseProvider,
    private fileUtil: FileUtilProvider,
    private appProvider: AppProvider
  ) {
    platform.ready().then(() => {
      this.initApp();
    });

    this.initTranslate();
  }

  async initApp() {
    if (!this.platform.is('tablet')) {
      this.screenOrientation.lock(this.screenOrientation.ORIENTATIONS.PORTRAIT);
    }
    this.mobileAccessibility.usePreferredTextZoom(false);

    // Okay, so the platform is ready and our plugins are available.
    // Here you can do any higher level native things you might need.
    this.statusBar.styleDefault();
    this.splashScreen.hide();

    await this.initDir();
    await this.initInsomnia();
    await this.initWebIntent();
    await this.logDeviceInfo();
    await this.dbProvider.init();
    this.pyBridge$.pipe(takeUntil(this.onDestroy$)).subscribe((state: PyBridgeState) => {
      if (state.isReady) {
        const elapsedTime = Date.now() - this.initStart;
        if (elapsedTime < 1500) {
          setTimeout(() => {
            this.rootPage = HomePage;
          }, this.waitTime - elapsedTime);
        } else {
          this.rootPage = HomePage;
        }
      }
    });
    this.pyBridgeActions.initialize();
    this.initStart = Date.now();
  }

  async initDir() {
    await this.fileUtil.createDirIfNotExist(this.file.applicationStorageDirectory, AppConstant.ANALYSIS_DIRECTORY_PATH);
    await this.fileUtil.createDirIfNotExist(this.file.externalRootDirectory, AppConstant.CARDIART_DIRECTORY_PATH);
    await this.fileUtil.createDirIfNotExist(this.file.externalRootDirectory, AppConstant.LOG_DIRECTORY_PATH);
    await this.reduceLogs();
  }

  async initInsomnia() {
    try {
      await this.insomnia.keepAwake();
    } catch (error) {
      this.appProvider.printAndWriteErrorLog(error);
    }
  }

  async initWebIntent() {
    try {
      const intent: Intent = await this.webIntent.getIntent();
      await this.handleWebIntent(intent);
    } catch (error) {
      this.appProvider.printAndWriteErrorLog(error);
    }
  }

  async logDeviceInfo() {
    await this.appProvider.printAndWriteDebugLog(`Device: ${this.device.manufacturer} ${this.device.model}`);
    await this.appProvider.printAndWriteDebugLog(`Version: ${this.device.version}`);
    await this.appProvider.printAndWriteDebugLog(`UserAgent: ${navigator.userAgent}`);
  }

  async handleWebIntent(intent: any) {
    this.appProvider.printAndWriteDebugLog('Received Intent: ' + JSON.stringify(intent));

    if (intent.extras && intent.extras.vendorId) {
      const data = {
        vendorId: intent.extras.vendorId,
        vendorName: intent.extras.vendorName || null,
        filename: intent.extras.filename || null,
        format: intent.extras.format || 1
      };
      this.intentActions.setData(data);

      const patient = {
        sn: intent.extras.sn || null,
        name: intent.extras.name || null,
        id: intent.extras.identityId || null,
        sex: intent.extras.gender || 'U',
        age: intent.extras.age ? intent.extras.age.toString() : null,
        note: null
      };
      this.patientActions.saveProfile(patient);
    } else {
      this.intentActions.clearData();
    }
  }

  async reduceLogs() {
    const sevenDaysBefore = moment().subtract(7, 'days');
    const today = moment();
    const files = await this.file.listDir(this.file.externalRootDirectory, AppConstant.LOG_DIRECTORY_PATH);
    files.forEach(file => {
      if (!file.isFile) return;
      const logFileName = file.name.substr(0, 8);
      const isLessSevenDays = moment(logFileName).isBetween(sevenDaysBefore, today);
      if (!isLessSevenDays) {
        file.remove(
          () => {},
          e => {
            console.error(e);
          }
        );
      }
    });
  }

  initTranslate() {
    // Set the default language for translation strings, and the current language.
    const defaultLang = 'en';
    const browserLang = this.translate.getBrowserLang();

    this.translate.setDefaultLang(defaultLang);
    if (browserLang) {
      if (browserLang === 'zh') {
        const cultureLang = this.translate.getBrowserCultureLang();
        this.translate.use(cultureLang);
      } else {
        this.translate.use(browserLang);
      }
    } else {
      this.translate.use(defaultLang);
    }
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }
}
