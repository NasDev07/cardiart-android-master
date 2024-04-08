import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule, isDevMode } from '@angular/core';
import { IonicApp, IonicErrorHandler, IonicModule } from 'ionic-angular';
import { NgReduxModule, NgRedux, DevToolsExtension } from '@angular-redux/store';
import { createLogger } from 'redux-logger';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { SplashScreen } from '@ionic-native/splash-screen';
import { StatusBar } from '@ionic-native/status-bar';
import { BLE } from '@ionic-native/ble';
import { BarcodeScanner } from '@ionic-native/barcode-scanner';
import { IonicStorageModule } from '@ionic/storage';
import { AppVersion } from '@ionic-native/app-version';
import { File } from '@ionic-native/file';
import { SocialSharing } from '@ionic-native/social-sharing';
import { ScreenOrientation } from '@ionic-native/screen-orientation';
import { SQLite } from '@ionic-native/sqlite';
import { Insomnia } from '@ionic-native/insomnia';
import { WebIntent } from '@ionic-native/web-intent';
import { MobileAccessibility } from '@ionic-native/mobile-accessibility';
import { Device } from '@ionic-native/device';
import { PinchZoomModule } from 'ngx-pinch-zoom';

import { MyApp } from './app.component';
import { HomePage } from '../pages/home/home';
import { DevicesPage } from '../pages/devices/devices';
import { ExaminationPage } from '../pages/examination/examination';
import { SettingsPage } from './../pages/settings/settings';
import { SubSettingsPage } from '../pages/settings/subsettings';
import { PatientPage } from '../pages/patient/patient';
import { RecordsPage } from '../pages/records/records';
import { RecordDetailPage } from '../pages/record-detail/record-detail';
import { RecordOptionPage } from '../pages/record-option/record-option';
import { LandingPage } from '../pages/landing/landing';
import { NotSelectedPage } from '../pages/records/not-selected';

import { EcgRTCompoment } from '../components/ecg-rt/ecg-rt';
import { SecsGrid } from '../components/secs-grid/secs-grid';
import { EcgV1Component } from '../components/ecg-v1/ecg-v1';
import { EcgV2Component } from '../components/ecg-v2/ecg-v2';

import * as DevicesReducer from '../store/ble-devices/reducer';
import * as SettingsReducer from '../store/settings/reducer';
import * as PatientReducer from '../store/patient/reducer';
import * as RecordsReducer from '../store/records/reducer';
import * as PyBridgeReducer from '../store/pybridge/reducer';
import * as IntentReducer from '../store/intent/reducer';
import { IAppState, AppReducer } from '../store';
import { DevicesActions } from '../store/ble-devices/actions';
import { SettingsActions } from '../store/settings/actions';
import { PatientActions } from './../store/patient/actions';
import { RecordsActions } from './../store/records/actions';
import { PyBridgeActions } from './../store/pybridge/actions';
import { IntentActions } from './../store/intent/actions';
import { ConvertService } from '../utils/convert.service';
import { DoubleTapDirective } from '../directives/double-tap/double-tap';
import { UtilProvider } from '../providers/util/util';
import { UIProvider } from '../providers/ui/ui';
import { DatabaseProvider } from '../providers/database/database';
import { AppProvider } from '../providers/app/app';
import { FileUtilProvider } from './../providers/util/fileUtil';

@NgModule({
  declarations: [
    MyApp,
    HomePage,
    DevicesPage,
    ExaminationPage,
    SettingsPage,
    SubSettingsPage,
    PatientPage,
    RecordsPage,
    RecordDetailPage,
    RecordOptionPage,
    LandingPage,
    NotSelectedPage,
    EcgRTCompoment,
    SecsGrid,
    EcgV1Component,
    EcgV2Component,
    DoubleTapDirective
  ],
  imports: [
    BrowserModule,
    IonicModule.forRoot(MyApp, { scrollPadding: false }),
    NgReduxModule,
    HttpClientModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader,
        deps: [HttpClient]
      }
    }),
    IonicStorageModule.forRoot(),
    PinchZoomModule
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    HomePage,
    DevicesPage,
    ExaminationPage,
    SettingsPage,
    SubSettingsPage,
    PatientPage,
    RecordsPage,
    RecordDetailPage,
    RecordOptionPage,
    LandingPage,
    NotSelectedPage
  ],
  providers: [
    StatusBar,
    SplashScreen,
    BLE,
    BarcodeScanner,
    AppVersion,
    File,
    SocialSharing,
    ScreenOrientation,
    SQLite,
    Insomnia,
    WebIntent,
    MobileAccessibility,
    Device,
    DevicesActions,
    SettingsActions,
    PatientActions,
    RecordsActions,
    PyBridgeActions,
    IntentActions,
    ConvertService,
    { provide: ErrorHandler, useClass: IonicErrorHandler },
    UtilProvider,
    UIProvider,
    DatabaseProvider,
    AppProvider,
    FileUtilProvider
  ]
})
export class AppModule {
  constructor(private ngRedux: NgRedux<IAppState>, private devTools: DevToolsExtension) {
    let middleware = [];
    let enhancers = [];
    if (isDevMode()) {
      middleware = [...middleware, createLogger()];
    }
    if (this.devTools.isEnabled()) {
      enhancers = [...enhancers, this.devTools.enhancer()];
    }
    this.ngRedux.configureStore(
      AppReducer,
      {
        bleDevices: { ...DevicesReducer.INITIAL_STATE },
        settings: { ...SettingsReducer.INITIAL_STATE },
        patient: { ...PatientReducer.INITIAL_STATE },
        records: { ...RecordsReducer.INITIAL_STATE },
        pyBridge: { ...PyBridgeReducer.INITIAL_STATE },
        intent: { ...IntentReducer.INITIAL_STATE }
      },
      middleware,
      enhancers
    );
  }
}
export function createTranslateLoader(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}
