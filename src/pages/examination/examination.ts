import { NgRedux, select } from '@angular-redux/store';
import { Component } from '@angular/core';
import { AppVersion } from '@ionic-native/app-version';
import { File } from '@ionic-native/file';
import { TranslateService } from '@ngx-translate/core';
import { LoadingController, NavController, Platform, ViewController } from 'ionic-angular';
import { Observable } from 'rxjs/Observable';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs/Subject';

import { EcgConfig, EcgLead } from '../../models/ecg';
import { UIProvider } from '../../providers/ui/ui';
import { UtilProvider } from './../../providers/util/util';
import { FileUtilProvider } from './../../providers/util/fileUtil';
import { AppProvider } from '../../providers/app/app';
import { IAppState } from '../../store';
import { DevicesActions } from '../../store/ble-devices/actions';
import { BLEDevice } from '../../store/ble-devices/models';
import { DeviceState } from '../../store/ble-devices/reducer';
import { PatientState } from '../../store/patient/reducer';
import { PyBridgeActions } from '../../store/pybridge/actions';
import { PyBridgeState } from '../../store/pybridge/reducer';
import { RecordsActions } from '../../store/records/actions';
import { Record } from '../../store/records/models';
import { SettingsState } from '../../store/settings/reducer';
import { ConvertService } from '../../utils/convert.service';
import { RecordDetailPage } from '../record-detail/record-detail';
import { Filter } from '../../store/pybridge/models';
import * as MCE12L001 from '../../constants/mce12l001';
import * as AppConstant from '../../constants/app';
import { DEFAULT_ECG_CONFIG } from '../../constants/ecg';
import { DEFAULT_SAMPLE_RATE, BT5_SAMPLE_RATE } from '../../constants/mce12l001';

@Component({
  selector: 'page-examination',
  templateUrl: 'examination.html'
})
export class ExaminationPage {
  @select() readonly patient$: Observable<PatientState>;
  @select() readonly bleDevices$: Observable<DeviceState>;
  @select() readonly settings$: Observable<SettingsState>;
  @select() readonly pyBridge$: Observable<PyBridgeState>;

  onDestroy$ = new Subject<void>();
  patientState: PatientState;
  settingsState: SettingsState;
  pyBridgeState: PyBridgeState;

  ecgConfig: EcgConfig = DEFAULT_ECG_CONFIG;
  sampleRate = DEFAULT_SAMPLE_RATE;
  divisor = 1;
  scaleX = 2;
  scaleY = 2;
  totalExaminationTime: number = 10; // second
  ecgLeads: EcgLead[] = [];
  ecgTimestamp: number = -1;
  receivedData: number[] = [];
  currentDevice: BLEDevice;
  /**
   * overflowLimit is smaller than 30000 * divisor
   */
  overflowAmount: number[] = [0, 0, 0, 0, 0, 0, 0, 0];
  overflowLimit: number = 235000;
  isReconnecting: boolean = false;
  recordTime: number = 0;
  heartRate: number = 0;
  isRecording: boolean = false;
  bleInitialized: boolean = false;
  isRunningPy: boolean = false;
  pyStep = 0;
  appPath: String;
  stopTimer: NodeJS.Timeout;
  // requestId: number;
  handleTimer: NodeJS.Timeout;
  hrTimeout: NodeJS.Timeout;
  sendTimeout: NodeJS.Timeout;
  overflowInterval: NodeJS.Timeout;
  t: string;
  isSampleRateOK = false;
  isStartOK = false;

  // Filter
  filterObj: Filter;
  bx0: number[][] = [];
  by0: number[][] = [];
  bx1: number[][] = [];
  by1: number[][] = [];
  avgDataArray: number[][] = [];
  avgData: number[] = [];
  isFilterReady: boolean = false;

  constructor(
    public platform: Platform,
    public navCtrl: NavController,
    public viewCtrl: ViewController,
    public loadingCtrl: LoadingController,
    private translate: TranslateService,
    private file: File,
    private appVersion: AppVersion,
    private ngRedux: NgRedux<IAppState>,
    private devicesActions: DevicesActions,
    private recordsActions: RecordsActions,
    private pyBridgeActions: PyBridgeActions,
    private convertService: ConvertService,
    private uiProvider: UIProvider,
    private utilProvider: UtilProvider,
    private fileUtil: FileUtilProvider,
    private appProvider: AppProvider
  ) {
    this.translate
      .get(['EXAMINATION.ANALYSING', 'DEVICES.RECONNECTING', 'MESSAGES.SAVE_RECORD_FAIL', 'MESSAGES.UNEXPECTED_ERROR'])
      .subscribe((res: string) => {
        this.t = res;
      });
    this.initChannelData();
    this.sampleRate = this.ngRedux.getState().bleDevices.isBT5Supported ? BT5_SAMPLE_RATE : DEFAULT_SAMPLE_RATE;
    console.log('[Exam]sampleRate: ' + this.sampleRate);
    this.appVersion
      .getPackageName()
      .then(name => {
        this.appPath = `/data/data/${name}`;
        this.appProvider.printAndWriteDebugLog('[Exam]appPath: ' + this.appPath);
      })
      .catch(e => {
        this.appProvider.printAndWriteErrorLog(e);
      });
  }

  ionViewDidLoad() {}

  async ionViewDidEnter() {
    await this.reset();
    this.patient$.pipe(takeUntil(this.onDestroy$)).subscribe((state: PatientState) => {
      this.patientState = state;
    });
    this.settings$.pipe(takeUntil(this.onDestroy$)).subscribe((state: SettingsState) => {
      this.settingsState = state;
    });
    this.bleDevices$.pipe(takeUntil(this.onDestroy$)).subscribe((state: DeviceState) => {
      this.currentDevice = state.connectedDevice;
      this.isReconnecting = state.isReconnecting;
      this.handleDeviceState();
    });
    this.pyBridge$.pipe(takeUntil(this.onDestroy$)).subscribe(async (state: PyBridgeState) => {
      this.pyBridgeState = state;
      this.isRunningPy = this.pyBridgeState.isRunning;
      if (this.pyStep === 0) {
        this.initFilter();
      } else if (this.pyStep === 1) {
        this.getHeartRate();
      }
    });

    this.handleReceivedData();
  }

  ionViewWillLeave() {
    this.onDestroy$.next();
  }

  ionViewWillUnload() {
    this.sendPackage(MCE12L001.CMD_STOP);
    // if (this.requestId) cancelAnimationFrame(this.requestId);
    this.onDestroy$.complete();
    if (this.handleTimer) clearTimeout(this.handleTimer);
    clearTimeout(this.sendTimeout);
    clearTimeout(this.hrTimeout);
    clearInterval(this.overflowInterval);
    this.stopRecord(false);
  }

  async reset() {
    this.bleInitialized = false;
    this.pyStep = 0;
    this.ecgLeads.forEach((ecgLead: EcgLead) => ecgLead.clearAll());
  }

  initFilter() {
    if (this.isRunningPy) return;

    const interval = setInterval(() => {
      if (this.currentDevice && this.settingsState) {
        clearInterval(interval);

        this.pyStep = 1;
        this.pyBridgeActions
          .getFilterParas(
            `${this.appPath}/${AppConstant.FILTER_OUTPUT_FILE}`,
            this.sampleRate,
            this.settingsState.highPassFilter,
            this.settingsState.lowPassFilter,
            '0',
            this.settingsState.ACNotchFilter,
            this.settingsState.EMGFilter ? '35' : '0'
          )
          .then((filter: Filter) => {
            if (filter) {
              this.filterObj = filter;
              if (this.filterObj.bvalid0) {
                for (let ch = 0; ch < this.ecgLeads.length; ch++) {
                  this.bx0[ch] = [];
                  this.by0[ch] = [];
                  for (let i = 0; i < this.filterObj.b0.length; i++) this.bx0[ch][i] = 0;
                  for (let i = 0; i < this.filterObj.a0.length; i++) this.by0[ch][i] = 0;
                }
              }
              if (this.filterObj.bvalid1) {
                for (let ch = 0; ch < this.ecgLeads.length; ch++) {
                  this.bx1[ch] = [];
                  this.by1[ch] = [];
                  for (let i = 0; i < this.filterObj.b1.length; i++) this.bx1[ch][i] = 0;
                  for (let i = 0; i < this.filterObj.a1.length; i++) this.by1[ch][i] = 0;
                }
              }
              for (let ch = 0; ch < this.ecgLeads.length; ch++) {
                this.avgDataArray[ch] = [];
                this.avgData[ch] = 0;
              }
              this.isFilterReady = true;
            }
          })
          .catch(err => {
            this.appProvider.printAndWriteErrorLog(err);
          });
      }
    }, 100);
  }

  handleDeviceState() {
    if (this.isReconnecting) {
      this.appProvider.printAndWriteDebugLog('[Exam]waiting to reconnect');
      this.uiProvider.presentLoading(
        null,
        {
          content: this.t['DEVICES.RECONNECTING'],
          dismissOnPageChange: true
        },
        false
      );
      this.stopRecord(false);
      this.bleInitialized = false;
      return;
    }

    if (this.currentDevice && !this.bleInitialized) {
      this.devicesActions
        .notify(this.currentDevice.id, MCE12L001.SERVICE_UUID, MCE12L001.TX1_CHARACTERISTIC)
        .pipe(takeUntil(this.onDestroy$))
        .subscribe((buffer: ArrayBuffer) => {
          console.log('[Exam]TX1', buffer);
          const data: number[] = [].slice.call(new Uint8Array(buffer));
          const cmd = this.convertService.intToHex(data[4], 2, true) + this.convertService.intToHex(data[5], 2, true);
          if (cmd === MCE12L001.CMD_SET_SAMPLE_RATE) {
            this.isSampleRateOK = true;
            this.sendDivisor(8 * 10);
          } else if (cmd === MCE12L001.CMD_SET_DIVISOR) {
            this.divisor = 8;
          } else if (cmd === '01ff') {
            this.appProvider.printAndWriteErrorLog('Command tag is not right');
          } else if (cmd === '02ff') {
            this.appProvider.printAndWriteErrorLog('Device FW is not supoort this command');
          }

          if (this.isSampleRateOK && !this.isStartOK) {
            this.isStartOK = true;
            // start after some delay
            this.sendTimeout = setTimeout(() => {
              this.sendStartPackage();
            }, 500);
          }
        });
      this.devicesActions
        .notify(this.currentDevice.id, MCE12L001.SERVICE_UUID, MCE12L001.TX2_CHARACTERISTIC)
        .pipe(takeUntil(this.onDestroy$))
        .subscribe((buffer: ArrayBuffer) => {
          let data = [].slice.call(new Uint8Array(buffer)); // TypeArray to array
          this.receivedData.push(data);
        });
      // this.tx4Subscribe = this.devicesActions
      //   .notify(
      //     this.currentDevice.id,
      //     MCE12L001.SERVICE_UUID,
      //     MCE12L001.TX4_CHARACTERISTIC
      //   )
      //   .pipe(takeUntil(this.onDestroy$))
      //   .subscribe((buffer: ArrayBuffer) => {
      //     console.log('[TX4]', buffer);
      //   });

      this.isSampleRateOK = this.isStartOK = false;
      this.sendSampleRate(this.sampleRate);

      this.uiProvider.dismissLoading();
      this.bleInitialized = true;
    }
  }

  initChannelData() {
    this.ecgLeads.push(EcgLead.newInstance('I'));
    this.ecgLeads.push(EcgLead.newInstance('II'));
    this.ecgLeads.push(EcgLead.newInstance('III'));
    this.ecgLeads.push(EcgLead.newInstance('aVR'));
    this.ecgLeads.push(EcgLead.newInstance('aVL'));
    this.ecgLeads.push(EcgLead.newInstance('aVF'));
    this.ecgLeads.push(EcgLead.newInstance('v1'));
    this.ecgLeads.push(EcgLead.newInstance('v2'));
    this.ecgLeads.push(EcgLead.newInstance('v3'));
    this.ecgLeads.push(EcgLead.newInstance('v4'));
    this.ecgLeads.push(EcgLead.newInstance('v5'));
    this.ecgLeads.push(EcgLead.newInstance('v6'));
  }

  handleReceivedData() {
    const concatChunks = this.receivedData.length;
    for (let i = 0; i < concatChunks; i++) {
      const data: any = this.receivedData.shift();
      this.handlePackage(data);
    }

    /**
     * Ref: https://developers.google.com/web/fundamentals/performance/rendering/optimize-javascript-execution?hl=zh-tw#requestanimationframe
     */
    // this.requestId = requestAnimationFrame(() => this.handleReceivedData());
    this.handleTimer = setTimeout(() => this.handleReceivedData(), 1);
  }

  handlePackage(data: number[]) {
    if (!this.isFilterReady) return;

    const totalSize = this.sampleRate * 30; // 30s
    if (this.ecgLeads[0].data.length >= totalSize) {
      this.ecgLeads.forEach((ecgLead: EcgLead) => ecgLead.clearData());
    }

    const header = data.splice(0, 14);
    // const checksum = (header[11] << 8) + header[10];
    const bitNumber = header[12];
    const sampleNumber = header[13];
    // const tag = new TextDecoder('utf-8').decode(
    //   new Uint8Array(header.slice(0, 4))
    // );

    this.checkLeadsOff(header[8], header[9]);

    // Check iMED tag
    // if (tag === 'iMED') {
    const currentTimestamp = (header[7] << 24) + (header[6] << 16) + (header[5] << 8) + header[4];

    // handle data lost
    const preTimestamp = currentTimestamp - 1;
    if (preTimestamp > this.ecgTimestamp) {
      console.error('[Exam]currentTimestamp: ' + currentTimestamp);
      console.error('[Exam]lastTimestamp: ' + this.ecgTimestamp);
      this.appProvider.printAndWriteErrorLog('[Exam]Lost ecg package length: ' + (preTimestamp - this.ecgTimestamp));
      // this.uiProvider.presentToast('Lost ECG package');
    } else if (preTimestamp < this.ecgTimestamp) {
      this.appProvider.printAndWriteErrorLog(
        '[Exam]Incorrect timestamp. Get timestamp ' + currentTimestamp + ', but now is ' + this.ecgTimestamp
      );

      return;
    }

    const int16Array = this.moreBit(data, bitNumber, sampleNumber);
    for (let i = 0; i < int16Array.length; i += 8) {
      /**
       * I & II & III & aVR & aVL & aVF need reverse
       */
      let c3 = -int16Array[i];
      let cV1 = int16Array[i + 1];
      let cV2 = int16Array[i + 2];
      let cV3 = int16Array[i + 3];
      let cV4 = int16Array[i + 4];
      let cV5 = int16Array[i + 5];
      let cV6 = int16Array[i + 6];
      let c2 = -int16Array[i + 7];
      let c1 = c2 - c3;
      let aVR = -(c1 + c2) / 2;
      let aVL = c1 - c2 / 2;
      let aVF = c2 - c1 / 2;

      this.processData(0, c1);
      this.processData(1, c2);
      this.processData(2, c3);
      this.processData(3, aVR);
      this.processData(4, aVL);
      this.processData(5, aVF);
      this.processData(6, cV1);
      this.processData(7, cV2);
      this.processData(8, cV3);
      this.processData(9, cV4);
      this.processData(10, cV5);
      this.processData(11, cV6);
    }
    this.ecgTimestamp = currentTimestamp;
    // } else {
    //   console.error('Not imed package');
    // }
  }

  processData(index: number, value: number) {
    if (this.isRecording) {
      this.ecgLeads[index].savedPureData.push(value);
    }
    const newValue = this.filter(index, value);
    this.ecgLeads[index].data.push(newValue);
    if (this.isRecording) {
      this.ecgLeads[index].savedData.push(newValue);
    }
  }

  getHeartRate() {
    if (this.isRunningPy) return;

    this.hrTimeout = setTimeout(async () => {
      try {
        const jsonObj = this.dataToJson(4);
        if (jsonObj != null) {
          await this.fileUtil.writeFile(
            this.file.applicationStorageDirectory,
            AppConstant.HEART_RATE_FILE,
            JSON.stringify(jsonObj),
            {
              replace: true
            }
          );
          await this.file.checkFile(this.file.applicationStorageDirectory, AppConstant.HEART_RATE_FILE);
          const heartRateObj = await this.pyBridgeActions.getHeartRate(
            `${this.appPath}/${AppConstant.HEART_RATE_FILE}`,
            `${this.appPath}/${AppConstant.ANALYSIS_LOG_FILE}`,
            `${this.appPath}/${AppConstant.ANALYSIS_DEBUG_FILE}`,
            `${this.appPath}/${AppConstant.ANALYSIS_OUTPUT_FILE}`
          );
          if (heartRateObj) this.heartRate = heartRateObj.heartRate;
        } else {
          this.getHeartRate();
        }
      } catch (error) {
        await this.appProvider.printAndWriteErrorLog(`[Exam]Get heart rate failed`);
        await this.appProvider.printAndWriteErrorLog(error);
        this.getHeartRate();
      }
    }, 5000);
  }

  checkLeadsOff(lowByte: number, highByte: number) {
    const rl = lowByte;
    const ll = highByte;
    const la = rl & 1;
    const ra = (rl & 128) >> 7;
    const allLeadsOff = ll === 255 || la === 1 || rl === 255 || ra === 1;

    const cV1 = !!((rl & 2) >> 1) || allLeadsOff;
    const cV2 = !!((rl & 4) >> 2) || allLeadsOff;
    const cV3 = !!((rl & 8) >> 3) || allLeadsOff;
    const cV4 = !!((rl & 16) >> 4) || allLeadsOff;
    const cV5 = !!((rl & 32) >> 5) || allLeadsOff;
    const cV6 = !!((rl & 64) >> 6) || allLeadsOff;
    const c1 = allLeadsOff;
    const c2 = allLeadsOff;
    const c3 = allLeadsOff;
    const aVR = allLeadsOff;
    const aVL = allLeadsOff;
    const aVF = allLeadsOff;

    this.ecgLeads[0].leadOff = c1;
    this.ecgLeads[1].leadOff = c2;
    this.ecgLeads[2].leadOff = c3;
    this.ecgLeads[3].leadOff = aVR;
    this.ecgLeads[4].leadOff = aVL;
    this.ecgLeads[5].leadOff = aVF;
    this.ecgLeads[6].leadOff = cV1;
    this.ecgLeads[7].leadOff = cV2;
    this.ecgLeads[8].leadOff = cV3;
    this.ecgLeads[9].leadOff = cV4;
    this.ecgLeads[10].leadOff = cV5;
    this.ecgLeads[11].leadOff = cV6;
  }

  moreBit(sourceData: number[], bitNumber: number, sampleNumber: number): number[] {
    const shift = 32 - bitNumber;
    let targetData = [];

    let origBitStr = '';
    for (let i = 0; i < sourceData.length; i++) {
      origBitStr += ('00000000' + sourceData[i].toString(2)).slice(-8);
    }

    for (let i = 0, j = 0; i + bitNumber <= origBitStr.length; i += bitNumber, j++) {
      const origSampleStr = origBitStr.substr(i, bitNumber);
      // uint to int
      // Ref: https://blog.vjeux.com/2013/javascript/conversion-from-uint8-to-int8-x-24.html
      const newSample = Math.floor(((parseInt(origSampleStr, 2) << shift) >> shift) * this.divisor + this.divisor / 2);
      this.overflowAmount[j % 8] = newSample;
      // console.log(i + ' : ' + newSample);
      targetData.push(newSample);
    }
    return targetData;
  }

  filter(index: number, value: number) {
    const minAvgArrayLength = this.sampleRate * 2;

    if (this.filterObj && this.filterObj.bvalid0) {
      value = this.fltCore(this.filterObj.a0, this.filterObj.b0, this.bx0[index], this.by0[index], value);
    }
    if (this.filterObj && this.filterObj.bvalid1) {
      value = this.fltCore(this.filterObj.a1, this.filterObj.b1, this.bx1[index], this.by1[index], value);
    }

    this.avgDataArray[index].push(value);

    let newValue = value - this.avgData[index];

    if (this.avgDataArray[index].length >= minAvgArrayLength) {
      const first = this.avgDataArray[index].shift();

      if (this.avgData[index] === 0) {
        this.avgData[index] = this.avgArray(this.avgDataArray[index]);
      } else {
        this.avgData[index] = (this.avgData[index] * minAvgArrayLength - first + value) / minAvgArrayLength;
      }
    }

    return newValue;
  }

  sumArray(data: Float64Array) {
    let sum = 0;
    let n = data.length;

    for (let i = 0; i < n; i++) sum = sum + data[i];
    return sum;
  }

  avgArray(data: number[]) {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    return sum / data.length;
  }

  fltCore(a: number[], b: number[], bx: number[], by: number[], x: number) {
    if (a.length === 0 || b.length === 0) return x;

    let len_bx = bx.length;
    let len_by = by.length;

    // console.log(' (1) bx = ', bx);

    for (let j = 0; j < len_bx - 1; j++) bx[j] = bx[j + 1];
    bx[bx.length - 1] = x;
    // console.log(' (2) bx = ', bx);

    // w_x = inv_mul(bx, b, 0);
    let w_x = new Float64Array(len_bx);
    for (let j = 0; j < len_bx; j++) w_x[j] = bx[len_bx - j - 1] * b[j];
    // console.log(' (3) w_x = ', w_x);

    // w_y = inv_mul(by, a, 1);
    let w_y = new Float64Array(len_by);
    for (let j = 0; j < len_by - 1; j++) w_y[j] = by[len_by - j - 1] * a[j + 1];
    // console.log(' (4) w_y = ', w_y);

    let y_new = (this.sumArray(w_x) - this.sumArray(w_y)) / a[0];
    // console.log(' (5) y_new = ', y_new);

    // by = concatenate(by, y_new);
    for (let j = 0; j < len_by - 1; j++) by[j] = by[j + 1];
    by[len_by - 1] = y_new;
    // console.log(' (6) bx = '+ JSON.stringify(bx));

    return y_new;
  }

  async startRecord() {
    this.isRecording = true;
    this.pyStep = 2;
    clearTimeout(this.hrTimeout);
    this.runStopTimeout();
  }

  runStopTimeout() {
    this.stopTimer = setInterval(() => {
      this.recordTime = Math.min(
        Math.floor(this.ecgLeads[0].savedData.length / this.sampleRate),
        this.totalExaminationTime
      );

      if (this.ecgLeads[0].savedData.length >= this.sampleRate * this.totalExaminationTime) {
        this.stopRecord();
      }
    }, 200);
  }

  sendStartPackage() {
    this.ecgTimestamp = -1;
    this.sendPackage(MCE12L001.CMD_START);

    this.overflowInterval = setInterval(() => {
      const ret = this.overflowAmount.some(item => {
        return item > this.overflowLimit || item < -this.overflowLimit;
      });
      if (ret) {
        this.uiProvider.presentToast('Overflow');
      }
    }, 5000);
  }

  sendSampleRate(value: number) {
    const sapmleRate = this.convertService.intToHex(value, 8, true);
    this.sendPackage(MCE12L001.CMD_SET_SAMPLE_RATE, sapmleRate);
  }

  sendDivisor(value: number) {
    const divisor = this.convertService.intToHex(value, 8, true);
    this.sendPackage(MCE12L001.CMD_SET_DIVISOR, divisor);
  }

  async sendPackage(command: string, dataLength: string = '', data: string = '') {
    const cmdPackage = this.convertService.stringToHex('iCMD') + command + dataLength + data;
    const buffer = this.convertService.hexStringToByte(cmdPackage).buffer;
    console.log('[Exam]send package ' + cmdPackage);
    try {
      await this.devicesActions.write(
        this.currentDevice.id,
        MCE12L001.SERVICE_UUID,
        MCE12L001.RX1_CHARACTERISTIC,
        buffer
      );
    } catch (e) {
      await this.appProvider.printAndWriteErrorLog('[Exam]send package ' + cmdPackage + ' fail ');
      await this.appProvider.printAndWriteErrorLog(e);
    }
  }

  async stopRecord(isSave: boolean = true) {
    let failMessage: string;

    if (!this.isRecording) return;

    this.isRecording = false;
    clearInterval(this.stopTimer);

    if (isSave) {
      this.uiProvider.presentLoading(this.t['EXAMINATION.ANALYSING']);
      this.sendPackage(MCE12L001.CMD_STOP);
      // cancelAnimationFrame(this.requestId);
      clearTimeout(this.handleTimer);
      clearInterval(this.overflowInterval);
      console.log(this.ecgLeads);
      try {
        const ecgTotalDataLength = this.sampleRate * this.totalExaminationTime;
        this.ecgLeads.forEach((ecgLead: EcgLead) => {
          if (ecgLead.savedData.length > ecgTotalDataLength) {
            ecgLead.savedPureData.splice(ecgTotalDataLength);
            ecgLead.savedData.splice(ecgTotalDataLength);
          }
        });
        const pureDataJsonObj = this.dataToJson(0, true);
        const dataJsonObj = this.dataToJson(0, false);

        let record = new Record();
        record.patient = this.patientState;
        record.settings = this.settingsState;
        record.pureEcgData = pureDataJsonObj;
        record.ecgData = dataJsonObj;
        await this.fileUtil.writeFile(
          this.file.applicationStorageDirectory,
          AppConstant.ANALYSIS_FILE,
          JSON.stringify(pureDataJsonObj),
          {
            replace: true
          }
        );
        await this.file.checkFile(this.file.applicationStorageDirectory, AppConstant.ANALYSIS_FILE);
        if (this.isRunningPy) {
          await this.appProvider.printAndWriteErrorLog(`[Exam]PyBridgeState is still running`);
        } else {
          record.analysisData = await this.pyBridgeActions.analyzeECG(
            `${this.appPath}/${AppConstant.ANALYSIS_FILE}`,
            `${this.appPath}/${AppConstant.ANALYSIS_LOG_FILE}`,
            `${this.appPath}/${AppConstant.ANALYSIS_DEBUG_FILE}`,
            `${this.appPath}/${AppConstant.ANALYSIS_OUTPUT_FILE}`
          );
        }
        await this.appProvider.printAndWriteDebugLog('[Exam]analyze done: ' + JSON.stringify(record.analysisData));
        await this.fileUtil.removeFileIfExist(this.file.applicationStorageDirectory, AppConstant.ANALYSIS_FILE);
        await this.fileUtil.removeFileIfExist(this.file.applicationStorageDirectory, AppConstant.HEART_RATE_FILE);

        const ret = await this.recordsActions.saveRecord(record);
        if (ret) {
          this.navCtrl
            .push(RecordDetailPage, {
              record: record
            })
            .then(() => {
              // const index = this.viewCtrl.index;
              // this.navCtrl.remove(index);
            });
        } else {
          failMessage = this.t['MESSAGES.SAVE_RECORD_FAIL'];
        }
      } catch (e) {
        await this.appProvider.printAndWriteErrorLog(e);
        failMessage = this.t['MESSAGES.UNEXPECTED_ERROR'];
      }
      this.uiProvider.dismissLoading();

      if (failMessage) {
        await this.appProvider.printAndWriteErrorLog(failMessage);
        this.uiProvider.presentToast(failMessage);
        this.navCtrl.pop();
      }
    } else {
      this.pyStep = 1;
      this.getHeartRate();
    }

    this.ecgLeads.forEach((ecgLead: EcgLead) => ecgLead.clearSavedData());
    this.recordTime = 0;
  }

  dataToJson(mode: number, isPureData?: boolean) {
    let json: any;
    if (mode === 0) {
      json = {
        I: isPureData ? this.ecgLeads[0].savedPureData.toString() : this.ecgLeads[0].savedData.toString(),
        II: isPureData ? this.ecgLeads[1].savedPureData.toString() : this.ecgLeads[1].savedData.toString(),
        III: isPureData ? this.ecgLeads[2].savedPureData.toString() : this.ecgLeads[2].savedData.toString(),
        aVR: isPureData ? this.ecgLeads[3].savedPureData.toString() : this.ecgLeads[3].savedData.toString(),
        aVL: isPureData ? this.ecgLeads[4].savedPureData.toString() : this.ecgLeads[4].savedData.toString(),
        aVF: isPureData ? this.ecgLeads[5].savedPureData.toString() : this.ecgLeads[5].savedData.toString(),
        V1: isPureData ? this.ecgLeads[6].savedPureData.toString() : this.ecgLeads[6].savedData.toString(),
        V2: isPureData ? this.ecgLeads[7].savedPureData.toString() : this.ecgLeads[7].savedData.toString(),
        V3: isPureData ? this.ecgLeads[8].savedPureData.toString() : this.ecgLeads[8].savedData.toString(),
        V4: isPureData ? this.ecgLeads[9].savedPureData.toString() : this.ecgLeads[9].savedData.toString(),
        V5: isPureData ? this.ecgLeads[10].savedPureData.toString() : this.ecgLeads[10].savedData.toString(),
        V6: isPureData ? this.ecgLeads[11].savedPureData.toString() : this.ecgLeads[11].savedData.toString(),
        SampleRate: this.sampleRate.toString(),
        Duration: this.totalExaminationTime.toString(),
        Sex: this.patientState.sex,
        Age: this.utilProvider.getPatientAge(this.patientState.age, 0),
        MinnesCode: '',
        DeviceInfo: 'AVHCV11098',
        UV: '1000'
      };
    } else if (mode === 4) {
      const duration = 2;
      const length = this.sampleRate * duration;
      if (this.ecgLeads[0].data.length < length) return json;

      const start = this.ecgLeads[0].data.length - length;
      json = {
        I: this.ecgLeads[0].data.slice(start).toString(),
        II: this.ecgLeads[1].data.slice(start).toString(),
        III: this.ecgLeads[2].data.slice(start).toString(),
        aVR: this.ecgLeads[3].data.slice(start).toString(),
        aVL: this.ecgLeads[4].data.slice(start).toString(),
        aVF: this.ecgLeads[5].data.slice(start).toString(),
        V1: this.ecgLeads[6].data.slice(start).toString(),
        V2: this.ecgLeads[7].data.slice(start).toString(),
        V3: this.ecgLeads[8].data.slice(start).toString(),
        V4: this.ecgLeads[9].data.slice(start).toString(),
        V5: this.ecgLeads[10].data.slice(start).toString(),
        V6: this.ecgLeads[11].data.slice(start).toString(),
        SampleRate: this.sampleRate.toString(),
        Duration: duration,
        Sex: this.patientState.sex,
        Age: this.utilProvider.getPatientAge(this.patientState.age, 0),
        MinnesCode: '',
        DeviceInfo: 'AVHCV11098',
        UV: '1000'
      };
    }
    return json;
  }

  isShow(platformName: string, orientation?: string) {
    let ret: boolean;
    ret = this.platform.is(platformName);
    if (orientation === 'p') {
      ret = ret && this.platform.isPortrait();
    } else if (orientation === 'l') {
      ret = ret && this.platform.isLandscape();
    }
    return ret;
  }

  getPointName(channel: EcgLead) {
    let str = channel.pointName;
    if (channel.leadOff) {
      str += '(x)';
    }
    return str;
  }
}
