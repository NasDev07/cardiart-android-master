import { NgRedux } from '@angular-redux/store';
import { ChangeDetectorRef, Component } from '@angular/core';
import { File } from '@ionic-native/file';
import { SocialSharing } from '@ionic-native/social-sharing';
import { TranslateService } from '@ngx-translate/core';
import * as html2canvas from 'html2canvas';
import { LoadingController, NavController, NavParams, Platform, PopoverController } from 'ionic-angular';
import * as jsPDF from 'jspdf';
import * as xmlbuilder from 'xmlbuilder';

import { EcgConfig, EcgLead } from '../../models/ecg';
import { UIProvider } from '../../providers/ui/ui';
import { UtilProvider } from '../../providers/util/util';
import { FileUtilProvider } from './../../providers/util/fileUtil';
import { AppProvider } from './../../providers/app/app';
import { IAppState } from '../../store';
import { IntentState } from '../../store/intent/reducer';
import { PatientState } from '../../store/patient/reducer';
import { SettingsState } from '../../store/settings/reducer';
import { RecordsActions } from '../../store/records/actions';
import { DevicesActions } from '../../store/ble-devices/actions';
import { Record } from '../../store/records/models';
import { NotSelectedPage } from '../records/not-selected';
import { RecordOptionPage } from '../record-option/record-option';
import * as AppConstant from '../../constants/app';
import { DEFAULT_ECG_CONFIG } from '../../constants/ecg';

@Component({
  selector: 'page-record-detail',
  templateUrl: 'record-detail.html'
})
export class RecordDetailPage {

  settingsState: SettingsState;
  intentState: IntentState;

  ecgConfig: EcgConfig = DEFAULT_ECG_CONFIG;
  sampleRate: number;
  totalSeconds: number;
  // pxPerMm = 5;
  pxPerMm: number = 0;
  // pxPerMm = 16;
  gridSize: number = 0;
  scaleX: number = 2;
  scaleY: number = 2;
  xAxis: number = Math.floor(this.scaleX * this.ecgConfig.baseLengthPerSec * 10) / 10;
  yAxis: number = Math.floor(this.scaleY * this.ecgConfig.baseLengthPerMilliVolt * 10) / 10;
  record: Record;
  patient: PatientState;
  settings: SettingsState;
  ecgLeads: EcgLead[] = [];
  suggestion: string = '';
  ecgPara: any;
  diseaseCase: number;
  t: any;
  isLoading: boolean = true;
  imageSrc: string;
  scale: number = 0.5;

  constructor(
    public platform: Platform,
    public navCtrl: NavController,
    public navParams: NavParams,
    public popoverCtrl: PopoverController,
    public loadingCtrl: LoadingController,
    private chRef: ChangeDetectorRef,
    private translate: TranslateService,
    private sharing: SocialSharing,
    private file: File,
    private ngRedux: NgRedux<IAppState>,
    private util: UtilProvider,
    private uiProvider: UIProvider,
    private fileUtil: FileUtilProvider,
    private appProvider: AppProvider,
    private recordsActions: RecordsActions,
    private devicesActions: DevicesActions
  ) {
    this.translate
      .get([
        'PATIENT.UNKNOWN',
        'PATIENT.YEARS_OLD',
        'PATIENT.MALE',
        'PATIENT.FEMALE',
        'COMMON.PROCESSING',
        'RECORDS_DETAIL.DISEASE_NORMAL',
        'RECORDS_DETAIL.DISEASE_ABNORMAL',
        'RECORDS_DETAIL.DISEASE_UNKNOWN'
      ])
      .subscribe((res: string) => {
        this.t = res;
      });
    this.record = navParams.get('record');
    // console.log(this.record);
    this.patient = this.record.patient;
    this.settings = this.record.settings;
    if (this.record.analysis && this.record.analysis.diseaseCase) {
      this.diseaseCase = this.record.analysis.diseaseCase;
    }
    this.loadEcgData();
  }

  async ionViewDidLoad() {
    this.intentState = this.ngRedux.getState().intent;
    this.ecgPara = this.record.ecgPara;
    this.checkSettingsState();
  }

  ionViewWillUnload() {}

  async loadEcgData() {
    try {
      await this.file.checkFile(this.file.dataDirectory, `${this.record.sn}-pure.json`);
      const pureData = await this.file.readAsText(this.file.dataDirectory, `${this.record.sn}-pure.json`);
      this.record.pureEcgData = JSON.parse(pureData);
    } catch (error) {
      this.appProvider.printAndWriteErrorLog(`Read ${this.record.sn}-pure.json failed`);
      this.appProvider.printAndWriteErrorLog(error);
    }
    try {
      const data = await this.file.readAsText(this.file.dataDirectory, `${this.record.sn}.json`);
      this.record.ecgData = JSON.parse(data);
      this.sampleRate = Number(this.record.ecgData.SampleRate);
      this.totalSeconds = Number(this.record.ecgData.Duration);
      if (this.sampleRate <= 400) {
        this.pxPerMm = Math.ceil(this.sampleRate / (5 * 5)); // 5 sGrids * 5 Grids, 1px for 1 sample
      } else {
        this.pxPerMm = Math.ceil(this.sampleRate / (5 * 5) / 2); // 5 sGrids * 5 Grids, 1px for 2 samples
      }
      console.log('pxPerMm: ' + this.pxPerMm);
      this.gridSize = this.pxPerMm * 5;
      this.initView();
      this.initChannelData();
    } catch (error) {
      this.appProvider.printAndWriteErrorLog(error);
    }
  }

  checkSettingsState() {
    this.settingsState = this.ngRedux.getState().settings;
    if (this.record.mnCode) {
      if (this.settingsState.showMinnesotaCode && !this.settingsState.symptomIndication) {
        const mnCodeName = this.record.mnCode.map(item => item.name);
        this.suggestion = `[${mnCodeName.toString()}]`;
      } else {
        this.record.mnCode.forEach(item => {
          if (this.settingsState.showMinnesotaCode) this.suggestion += `[${item.name}]\n`;
          if (this.settingsState.symptomIndication) this.suggestion += `${item.desc}\n`;
        });
      }
    }
  }

  initChannelData() {
    this.ecgLeads.push(EcgLead.fromJson(['I'], this.record.ecgData.I));
    this.ecgLeads.push(EcgLead.fromJson(['II'], this.record.ecgData.II));
    this.ecgLeads.push(EcgLead.fromJson(['III'], this.record.ecgData.III));
    this.ecgLeads.push(EcgLead.fromJson(['aVR'], this.record.ecgData.aVR));
    this.ecgLeads.push(EcgLead.fromJson(['aVL'], this.record.ecgData.aVL));
    this.ecgLeads.push(EcgLead.fromJson(['aVF'], this.record.ecgData.aVF));
    this.ecgLeads.push(EcgLead.fromJson(['v1'], this.record.ecgData.V1));
    this.ecgLeads.push(EcgLead.fromJson(['v2'], this.record.ecgData.V2));
    this.ecgLeads.push(EcgLead.fromJson(['v3'], this.record.ecgData.V3));
    this.ecgLeads.push(EcgLead.fromJson(['v4'], this.record.ecgData.V4));
    this.ecgLeads.push(EcgLead.fromJson(['v5'], this.record.ecgData.V5));
    this.ecgLeads.push(EcgLead.fromJson(['v6'], this.record.ecgData.V6));
    this.ecgLeads = this.ecgLeads.slice();

    this.chRef.detectChanges();
  }

  initView() {
    this.setUpWaveformView();
    this.setUpReportView();
    this.setUpEcgParameterView();
    this.setUpEcgWaveformBackground();
  }

  setUpWaveformView() {
    const contentElement: any = document.querySelector('#waveform');
    const schematicPurseSize = (this.scaleX * this.ecgConfig.baseLengthPerSec * this.pxPerMm) / 5; // 0.2s
    const schematicPurseWidth = Math.ceil(schematicPurseSize / this.gridSize) * this.gridSize; // round up grid
    const leftContentWidth =
      (schematicPurseWidth + this.pxPerMm * this.scaleX * this.ecgConfig.baseLengthPerSec * this.totalSeconds) *
      this.scale;
    const rightContentWidth = 600 * this.scale;
    const width = leftContentWidth + rightContentWidth;
    contentElement.style.width = `${width}px`;
  }

  setUpReportView() {
    const element: any = document.querySelector('#report');
    const scaleX = 2;
    const schematicPurseSize = (scaleX * this.ecgConfig.baseLengthPerSec * this.pxPerMm) / 5; // 0.2s
    const width =
      (schematicPurseSize + this.pxPerMm * scaleX * this.ecgConfig.baseLengthPerSec * this.totalSeconds) * this.scale +
      10;
    element.style.width = `${width}px`;
    element.style.fontSize = `${28 * this.scale}px`;
  }

  setUpEcgParameterView() {
    const elements = <HTMLElement[]>(<any>document.getElementsByClassName('parameter'));
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      element.style.minHeight = `${this.gridSize * this.scale}px`;
      element.style.paddingLeft = `${this.gridSize * this.scale}px`;
      element.style.fontSize = `${35 * this.scale}px`;
    }
  }

  setUpEcgWaveformBackground() {
    // 1 grid = 5mm, Gird image = 5 grids
    const gridImageSize = this.gridSize * 5;
    const elements = <HTMLElement[]>(<any>document.getElementsByClassName('ecg-waveform'));
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      element.style.backgroundImage = `url(./assets/imgs/grid.svg)`;
      element.style.backgroundSize = `${gridImageSize * this.scale}px`;
    }
  }

  async save(event: any) {
    this.uiProvider.presentLoading(this.t['COMMON.PROCESSING']);
    this.renderReportCanvas().then(canvas => {
      // console.log('[Detail]canvas:' + canvas.width + ',' + canvas.height);
      const imgData = canvas.toDataURL('image/jpeg').split(',')[1];
      const filename = this.intentState.filename
        ? this.intentState.filename
        : `${this.record.fileSN}-${this.util.getDateTime(this.record.createdAt, 1)}`;
      let data: Blob | ArrayBuffer;
      let filepath: string;

      if (this.intentState.format === 1) {
        const doc = new jsPDF('l', 'mm', 'a4');
        const padding = 0;
        //Add image Canvas to PDF
        doc.addImage(
          imgData,
          'jpeg',
          padding,
          padding,
          doc.internal.pageSize.getWidth() - padding * 2,
          doc.internal.pageSize.getHeight() - padding * 2
        );

        data = doc.output('arraybuffer');
        filepath = `${AppConstant.CARDIART_DIRECTORY_PATH}${filename}.pdf`;
      } else if (this.intentState.format === 2) {
        data = this.b64toBlob(imgData, 'image/jpeg');
        filepath = `${AppConstant.CARDIART_DIRECTORY_PATH}${filename}.jpg`;
      } else {
        this.appProvider.printAndWriteErrorLog(`Unknown format ${this.intentState.format}`);
        return;
      }

      this.fileUtil.writeFile(this.file.externalRootDirectory, filepath, data, { replace: true }).then(
        async () => {
          this.uiProvider.dismissLoading();
          await this.devicesActions.uninitialize();
          const uriPath = `${this.file.externalRootDirectory}${filepath}`;
          this.appProvider.printAndWriteDebugLog(`sendResult uri string: ${uriPath}`);
          (<any>window).plugins.intentShim.sendResult({ url: uriPath }, () => {});
        },
        async err => {
          await this.appProvider.printAndWriteErrorLog('[Detail]Image created failed');
          await this.appProvider.printAndWriteErrorLog(err);
          this.uiProvider.dismissLoading();
          await this.devicesActions.uninitialize();
          (<any>window).plugins.intentShim.sendResult({}, () => {});
        }
      );
    });
  }

  export(event: any) {
    let popover = this.popoverCtrl.create(RecordOptionPage);
    popover.onDidDismiss((data: string) => {
      switch (data) {
        case 'PDF':
          this.exportPDF();
          break;
        case 'JPG':
          this.exportJPG();
          break;
        case 'XML':
          this.exportXML();
          break;
        case 'Delete':
          this.recordsActions.deleteRecords(this.record).then(() => {
            if (this.navCtrl.canGoBack()) {
              this.navCtrl.pop();
            } else {
              this.navCtrl.setRoot(NotSelectedPage);
            }
          });
          break;
        case 'export-debug-files':
          this.exportDebugFiles();
          break;
      }
    });
    popover.present({
      ev: event
    });
  }

  exportPDF() {
    this.uiProvider.presentLoading(this.t['COMMON.PROCESSING']);
    console.time('exportPDF');
    this.renderReportCanvas().then(canvas => {
      // console.log('[Detail]canvas:' + canvas.width + ',' + canvas.height);
      const imgData = canvas.toDataURL('image/jpeg').split(',')[1];
      const doc = new jsPDF('l', 'mm', 'a4');

      const padding = 0;
      //Add image Canvas to PDF
      doc.addImage(
        imgData,
        'jpeg',
        padding,
        padding,
        doc.internal.pageSize.getWidth() - padding * 2,
        doc.internal.pageSize.getHeight() - padding * 2
      );

      const pdfOutput: ArrayBuffer = doc.output('arraybuffer');
      const fileName = `${AppConstant.CARDIART_DIRECTORY_PATH}${this.record.fileSN}-${this.util.getDateTime(
        this.record.createdAt,
        1
      )}.pdf`;
      this.fileUtil
        .writeFile(this.file.externalRootDirectory, fileName, pdfOutput, {
          replace: true
        })
        .then(success => {
          console.timeEnd('exportPDF');
          this.uiProvider.dismissLoading();
          this.share(`${this.file.externalRootDirectory}${fileName}`);
        })
        .catch(async error => {
          await this.appProvider.printAndWriteErrorLog('[Detail]PDF created failed');
          await this.appProvider.printAndWriteErrorLog('[Detail]Cannot Create PDF File: ' + JSON.stringify(error));
          this.uiProvider.dismissLoading();
        });
    });
  }

  exportJPG() {
    this.uiProvider.presentLoading(this.t['COMMON.PROCESSING']);
    console.time('exportJPG');
    this.renderReportCanvas().then(canvas => {
      // console.log('[Detail]canvas:' + canvas.width + ',' + canvas.height);
      const imgData = canvas.toDataURL('image/jpeg').split(',')[1];
      const blob = this.b64toBlob(imgData, 'image/jpeg');
      const fileName = `${AppConstant.CARDIART_DIRECTORY_PATH}${this.record.fileSN}-${this.util.getDateTime(
        this.record.createdAt,
        1
      )}.jpg`;
      this.fileUtil
        .writeFile(this.file.externalRootDirectory, fileName, blob, {
          replace: true
        })
        .then(
          res => {
            console.timeEnd('exportJPG');
            this.uiProvider.dismissLoading();
            this.share(`${this.file.externalRootDirectory}${fileName}`);
          },
          async err => {
            await this.appProvider.printAndWriteErrorLog('[Detail]Image created failed');
            await this.appProvider.printAndWriteErrorLog(err);
            this.uiProvider.dismissLoading();
          }
        );
    });
  }

  displayEcg() {
    console.time('displayEcg');
    this.renderWaveformCanvas().then(canvas => {
      this.imageSrc = canvas.toDataURL('image/jpeg');
      this.isLoading = false;
      this.chRef.detectChanges();
      console.timeEnd('displayEcg');
    });
  }

  renderWaveformCanvas() {
    return html2canvas(document.querySelector('#waveform'), {
      onclone: doc => {
        const element = doc.querySelector('#waveform');
        element.style.display = 'block';
        element.style.overflow = 'visible';
      },
      scale: 1
    });
  }

  renderReportCanvas() {
    return html2canvas(document.querySelector('#report'), {
      onclone: doc => {
        const element = doc.querySelector('#report');
        element.style.display = 'block';
        element.style.overflow = 'visible';
      },
      scale: 1
    });
  }

  exportXML() {
    this.uiProvider.presentLoading(this.t['COMMON.PROCESSING']);
    const hr = this.ecgPara && this.ecgPara.hr && this.ecgPara.hr[0] !== 0 ? Math.round(this.ecgPara.hr[1]) : '';
    const pr = this.ecgPara && this.ecgPara.pr && this.ecgPara.pr[0] !== 0 ? Math.round(this.ecgPara.pr[1]) : '';
    const qrs = this.ecgPara && this.ecgPara.qrs && this.ecgPara.qrs[0] !== 0 ? Math.round(this.ecgPara.qrs[1]) : '';
    const qt = this.ecgPara && this.ecgPara.qt && this.ecgPara.qt[0] !== 0 ? Math.round(this.ecgPara.qt[1]) : '';
    const qtc = this.ecgPara && this.ecgPara.qtc && this.ecgPara.qtc[0] !== 0 ? Math.round(this.ecgPara.qtc[1]) : '';
    const paxis =
      this.ecgPara && this.ecgPara.paxis && this.ecgPara.paxis[0] !== 0 ? Math.round(this.ecgPara.paxis[1]) : '';
    const qrsaxis =
      this.ecgPara && this.ecgPara.qrsaxis && this.ecgPara.qrsaxis[0] !== 0 ? Math.round(this.ecgPara.qrsaxis[1]) : '';
    const taxis =
      this.ecgPara && this.ecgPara.taxis && this.ecgPara.taxis[0] !== 0 ? Math.round(this.ecgPara.taxis[1]) : '';
    const isPureDataExist = this.record.pureEcgData ? true : false;
    let xml = xmlbuilder
      .create('BTypeECG', { encoding: 'UTF-16' })
      .ele('DocumentInfo')
      .ele('DocumentVersion', '1.0')
      .up()
      .ele('DocumentType', 'INFINITT CDIS B Type')
      .up()
      .ele('DocumentName')
      .up()
      .up()
      .ele('PatientInfo')
      .ele('PatientID')
      .up()
      .ele('PatientName')
      .ele('LastName', this.patient.name ? this.patient.name : '')
      .up()
      .ele('MidName')
      .up()
      .ele('FirstName')
      .up()
      .ele('NickName')
      .up()
      .up()
      .ele('PatientDOB')
      .up()
      .ele('PatientSEX', this.util.getPatientSex(this.patient.sex, true))
      .up()
      .ele('PatientAge', this.patient.age ? this.patient.age : '')
      .up()
      .ele('PatientAddress')
      .ele('Country')
      .up()
      .ele('City')
      .up()
      .ele('PostalCode')
      .up()
      .ele('State')
      .up()
      .ele('StreetAddress')
      .up()
      .up()
      .ele('PatientPhone')
      .up()
      .ele('PatientFax')
      .up()
      .ele('PatientRace')
      .up()
      .ele('ClinicalInfo')
      .ele('DiastolocBP')
      .ele('mmHg')
      .up()
      .up()
      .ele('SystolicBP')
      .ele('mmHg')
      .up()
      .up()
      .ele('HeartRate')
      .ele('HR')
      .up()
      .up()
      .ele('Height')
      .ele('Cm')
      .up()
      .up()
      .ele('Weight')
      .ele('Kg')
      .up()
      .up()
      .ele('Pale')
      .up()
      .ele('Sweaty')
      .up()
      .ele('Smoker')
      .up()
      .ele('Alcohol')
      .up()
      .ele('Hypertension')
      .up()
      .ele('Diabetes')
      .up()
      .ele('Medidation')
      .up()
      .up()
      .up()
      .ele('StudyInfo')
      .ele('StudyUID')
      .up()
      .ele('StudyDate', this.util.getDateTime(this.record.createdAt, 2))
      .up()
      .ele('StudyTime', this.util.getDateTime(this.record.createdAt, 3))
      .up()
      .ele('DefaultRhythm')
      .up()
      .ele('Request')
      .up()
      .ele('Record', {
        AcqDate: this.util.getDateTime(this.record.createdAt, 2),
        AcqTime: this.util.getDateTime(this.record.createdAt, 3),
        Timegain: '25 mm/sec'
      })
      .ele('InstitutionNM', 'iMED')
      .up()
      .ele('InstitutionlocationId')
      .up()
      .ele('InstitutionlocationName')
      .up()
      .ele('DepartmentCD')
      .up()
      .ele('DocumentName')
      .up()
      .ele('OrderRoomCD')
      .up()
      .ele('OrderRoomNM')
      .up()
      .ele('OrderAuthor')
      .up()
      .ele('StudyRoomCD')
      .up()
      .ele('StudyRoomNM')
      .up()
      .ele('StudyAuthor')
      .up()
      .up()
      .ele('Device', { Manufacturer: 'VH' })
      .ele('DeviceCD')
      .up()
      .ele('Type')
      .up()
      .ele('Model')
      .up()
      .ele('SerialNumber', this.record.fileSN)
      .up()
      .ele('BaseLineFilter')
      .up()
      .ele('LowpassFilter')
      .up()
      .ele('FilterBitmap')
      .up()
      .up()
      .ele('Comment')
      .up()
      .ele('MedicalHistory')
      .up()
      .ele('Diagnosis')
      .up()
      .ele('MeasurementDate')
      .up()
      .ele('MeasurementTime')
      .up()
      .ele('FileLink')
      .up()
      .ele('SampleRate', this.sampleRate)
      .up()
      .ele('SignalBandwidth', '60~ 0.5 - 40')
      .up()
      .ele('XOffset')
      .up()
      .ele('Duration')
      .up()
      .ele('Unit')
      .up()
      .ele('From')
      .up()
      .ele('To')
      .up()
      .ele('Data')
      .up()
      .ele('Encoding')
      .up()
      .ele('Scale')
      .up()
      .ele('ShortmeasSegment')
      .ele('Heartrate', hr)
      .up()
      .ele('Meanprint', pr)
      .up()
      .ele('Meanqrsdur', qrs)
      .up()
      .ele('Meanqtint', qt)
      .up()
      .ele('Meanqtc', qtc)
      .up()
      .ele('Pfrontaxis', paxis)
      .up()
      .ele('Qrsfrontaxis', qrsaxis)
      .up()
      .ele('Tfrontaxis', taxis)
      .up()
      .up()
      .ele('Interpretation')
      .ele('Severity')
      .up()
      .ele('Mdsignatureline')
      .up()
      .ele('Statement')
      .ele('Rightstatement')
      .up()
      .ele('Leftstatement')
      .up()
      .up()
      .up()
      .ele('amplitudegain')
      .ele('overallgain', '10.00')
      .up()
      .ele('groupgain', '10.00')
      .up()
      .up()
      .ele('RecordData')
      .ele('Channel', 'I')
      .up()
      .ele('Waveform', { Comment: '' })
      .ele('PureData', isPureDataExist ? this.record.pureEcgData.I : '')
      .up()
      .ele('Data', this.record.ecgData.I)
      .up()
      .up()
      .ele('Channel', 'II')
      .up()
      .ele('Waveform', { Comment: '' })
      .ele('PureData', isPureDataExist ? this.record.pureEcgData.II : '')
      .up()
      .ele('Data', this.record.ecgData.II)
      .up()
      .up()
      .ele('Channel', 'III')
      .up()
      .ele('Waveform', { Comment: '' })
      .ele('PureData', isPureDataExist ? this.record.pureEcgData.III : '')
      .up()
      .ele('Data', this.record.ecgData.III)
      .up()
      .up()
      .ele('Channel', 'aVR')
      .up()
      .ele('Waveform', { Comment: '' })
      .ele('PureData', isPureDataExist ? this.record.pureEcgData.aVR : '')
      .up()
      .ele('Data', this.record.ecgData.aVR)
      .up()
      .up()
      .ele('Channel', 'aVL')
      .up()
      .ele('Waveform', { Comment: '' })
      .ele('PureData', isPureDataExist ? this.record.pureEcgData.aVL : '')
      .up()
      .ele('Data', this.record.ecgData.aVL)
      .up()
      .up()
      .ele('Channel', 'aVF')
      .up()
      .ele('Waveform', { Comment: '' })
      .ele('PureData', isPureDataExist ? this.record.pureEcgData.aVF : '')
      .up()
      .ele('Data', this.record.ecgData.aVF)
      .up()
      .up()
      .ele('Channel', 'V1')
      .up()
      .ele('Waveform', { Comment: '' })
      .ele('PureData', isPureDataExist ? this.record.pureEcgData.V1 : '')
      .up()
      .ele('Data', this.record.ecgData.V1)
      .up()
      .up()
      .ele('Channel', 'V2')
      .up()
      .ele('Waveform', { Comment: '' })
      .ele('PureData', isPureDataExist ? this.record.pureEcgData.V2 : '')
      .up()
      .ele('Data', this.record.ecgData.V2)
      .up()
      .up()
      .ele('Channel', 'V3')
      .up()
      .ele('Waveform', { Comment: '' })
      .ele('PureData', isPureDataExist ? this.record.pureEcgData.V3 : '')
      .up()
      .ele('Data', this.record.ecgData.V3)
      .up()
      .up()
      .ele('Channel', 'V4')
      .up()
      .ele('Waveform', { Comment: '' })
      .ele('PureData', isPureDataExist ? this.record.pureEcgData.V4 : '')
      .up()
      .ele('Data', this.record.ecgData.V4)
      .up()
      .up()
      .ele('Channel', 'V5')
      .up()
      .ele('Waveform', { Comment: '' })
      .ele('PureData', isPureDataExist ? this.record.pureEcgData.V5 : '')
      .up()
      .ele('Data', this.record.ecgData.V5)
      .up()
      .up()
      .ele('Channel', 'V6')
      .up()
      .ele('Waveform', { Comment: '' })
      .ele('PureData', isPureDataExist ? this.record.pureEcgData.V6 : '')
      .up()
      .ele('Data', this.record.ecgData.V6)
      .up()
      .up()
      .ele('Measurements', { Label: '', Unit: '', Value: '', Comment: '' })
      .end({ pretty: true });

    const fileName = `${AppConstant.CARDIART_DIRECTORY_PATH}${this.record.fileSN}-${this.util.getDateTime(
      this.record.createdAt,
      1
    )}.xml`;
    this.fileUtil
      .writeFile(this.file.externalRootDirectory, fileName, xml, {
        replace: true
      })
      .then(success => {
        this.uiProvider.dismissLoading();
        this.share(`${this.file.externalRootDirectory}${fileName}`);
      })
      .catch(async error => {
        await this.appProvider.printAndWriteErrorLog('[Detail]File created failed');
        await this.appProvider.printAndWriteErrorLog(error);
        this.uiProvider.dismissLoading();
      });
  }

  async exportDebugFiles() {
    this.uiProvider.presentLoading(this.t['COMMON.PROCESSING']);
    const sn = this.record.sn;
    const destDir = `${AppConstant.DEBUG_DIRECTORY_PATH}/${this.record.sn}`;

    try {
      await this.fileUtil.createDirIfNotExist(this.file.externalRootDirectory, destDir);
    } catch (e) {
      await this.appProvider.printAndWriteErrorLog(e);
    }
    try {
      await this.file.writeFile(
        this.file.externalRootDirectory,
        `${destDir}/${sn}-analysis.json`,
        JSON.stringify(this.record.analysisData),
        {
          replace: true
        }
      );
    } catch (e) {
      await this.appProvider.printAndWriteErrorLog(e);
    }
    try {
      await this.file.copyFile(
        this.file.dataDirectory,
        `${sn}-pure.json`,
        this.file.externalRootDirectory,
        `${destDir}/${sn}-pureEcg.json`
      );
    } catch (e) {
      await this.appProvider.printAndWriteErrorLog(e);
    }
    try {
      await this.file.copyFile(
        this.file.dataDirectory,
        `${sn}.json`,
        this.file.externalRootDirectory,
        `${destDir}/${sn}-ecg.json`
      );
    } catch (e) {
      await this.appProvider.printAndWriteErrorLog(e);
    }
    try {
      await this.file.copyFile(
        this.file.applicationStorageDirectory,
        AppConstant.ANALYSIS_LOG_FILE,
        this.file.externalRootDirectory,
        `${destDir}/coreECGLog.txt`
      );
    } catch (e) {
      await this.appProvider.printAndWriteErrorLog(e);
    }
    try {
      await this.file.copyFile(
        this.file.applicationStorageDirectory,
        AppConstant.ANALYSIS_DEBUG_FILE,
        this.file.externalRootDirectory,
        `${destDir}/coreECGDebug.txt`
      );
    } catch (e) {
      await this.appProvider.printAndWriteErrorLog(e);
    }
    this.uiProvider.dismissLoading();
  }

  b64toBlob(b64Data: string, contentType: string) {
    contentType = contentType || '';
    let sliceSize = 512;
    let byteCharacters = atob(b64Data);
    let byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      let slice = byteCharacters.slice(offset, offset + sliceSize);

      let byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      let byteArray = new Uint8Array(byteNumbers);

      byteArrays.push(byteArray);
    }

    let blob = new Blob(byteArrays, { type: contentType });
    return blob;
  }

  share(filePath: string) {
    this.sharing.share(null, `${this.record.fileSN}-${this.util.getDateTime(this.record.createdAt, 1)}`, filePath);
  }

  getTitle() {
    const str = `[${this.record.fileSN}] ${this.util.getPatientName(this.patient.name)}.${this.util.getPatientSex(
      this.patient.sex,
      false
    )}.${this.util.getPatientAge(this.patient.age, 1)}`;
    return str;
  }

  getPdfTitle() {
    const str = `[${this.util.getPatientName(this.patient.name)},${this.util.getPatientSex(
      this.patient.sex,
      false
    )},${this.util.getPatientAge(this.patient.age, 1)}] 編號:${this.record.fileSN} `;
    return str;
  }

  getParameterString(isDefault?: boolean) {
    let str: string;
    if (isDefault) {
      str = `${this.ecgConfig.baseLengthPerSec * 2}mm/s ${this.ecgConfig.baseLengthPerMilliVolt *
        2}mm/mV\xa0\xa0\xa0\xa0`;
    } else {
      str = `${this.xAxis}mm/s ${this.yAxis}mm/mV\xa0\xa0\xa0\xa0`;
    }

    if (this.settings.highPassFilter !== '0') {
      str += `HP:${this.settings.highPassFilter}Hz;`;
    } else {
      str += `HP:OFF;`;
    }
    if (this.settings.lowPassFilter !== '0') {
      str += `LP:${this.settings.lowPassFilter}Hz;`;
    } else {
      str += `LP:OFF;`;
    }
    if (this.settings.ACNotchFilter !== '0') {
      str += `AC:${this.settings.ACNotchFilter}Hz;`;
    } else {
      str += `AC:OFF;`;
    }
    if (this.settings.EMGFilter) {
      str += 'EMG:ON';
    } else {
      str += 'EMG:OFF';
    }
    return str;
  }

  getDiseaseCaseName() {
    if (!this.diseaseCase) return;

    switch (this.diseaseCase) {
      case 1:
        return this.t['RECORDS_DETAIL.DISEASE_ABNORMAL'];
      case 2:
        return this.t['RECORDS_DETAIL.DISEASE_NORMAL'];
      case 3:
        return 'AMI';
      case 4:
        return 'BER';
      case 5:
        return 'LBBB';
      case 6:
        return 'RBBB';
      case 7:
        return 'LVH';
      case 8:
        return 'TACHYCARDIA';
      default:
        return this.t['RECORDS_DETAIL.DISEASE_UNKNOWN'];
    }
  }

  getDiseaseCaseMessage() {
    if (!this.diseaseCase) return;

    switch (this.diseaseCase) {
      case 3:
        return '*Abnormal ECG **Unconfirmed**\n***MEETS ST ELEVATION MI CRITERIA***\n';
      default:
        return '';
    }
  }

  getDateTimeForReport() {
    return this.util.getDateTime(this.record.createdAt, 0);
  }

  onOnePointerDoubleTap(event: any) {
    if (this.isLoading) return;

    this.isLoading = true;
    switch (this.scaleY) {
      case 1:
        this.scaleY = 2;
        break;
      case 2:
        this.scaleY = 4;
        break;
      case 4:
        this.scaleY = 1;
        break;
    }
    this.yAxis = Math.floor(this.scaleY * this.ecgConfig.baseLengthPerMilliVolt * 10) / 10;
    console.log('scaleY change to ' + this.scaleY);
    this.chRef.detectChanges();
  }

  onTwoPointersDoubleTap(event: any) {
    if (this.isLoading) return;

    this.isLoading = true;
    switch (this.scaleX) {
      case 1:
        this.scaleX = 2;
        break;
      case 2:
        this.scaleX = 4;
        break;
      case 4:
        this.scaleX = 1;
        break;
    }
    this.xAxis = Math.floor(this.scaleX * this.ecgConfig.baseLengthPerSec * 10) / 10;
    console.log('scaleX change to ' + this.scaleX);
    this.setUpWaveformView();
    this.chRef.detectChanges();
  }

  onWaveformRendered(event) {
    this.chRef.detectChanges();
    this.displayEcg();
  }
}
