import { PatientState } from '../patient/reducer';
import { SettingsState } from '../settings/reducer';
import { AnalysisData, Analysis, MinnesotaCode } from '../pybridge/models';

export interface EcgData {
  I: string;
  II: string;
  III: string;
  aVR: string;
  aVL: string;
  aVF: string;
  V1: string;
  V2: string;
  V3: string;
  V4: string;
  V5: string;
  V6: string;
  SampleRate: string;
  Duration: string;
  Sex: string;
  Age: string;
  MinnesCode: string;
  DeviceInfo: string;
  UV: string;
}

export class Record {
  private _id: number;
  private _patient: PatientState;
  private _settings: SettingsState;
  private _pureEcgData: EcgData;
  private _ecgData: EcgData;
  private _analysisData: AnalysisData;
  private _updatedAt: number;
  private _createdAt: number;

  constructor() {
    this.updatedAt = this.createdAt = Date.now();
  }

  public get id(): number {
    return this._id;
  }

  public set id(id: number) {
    this._id = id;
  }

  public get patient(): PatientState {
    return this._patient;
  }

  public set patient(patient: PatientState) {
    this._patient = patient;
  }

  public get settings(): SettingsState {
    return this._settings;
  }

  public set settings(settings: SettingsState) {
    this._settings = settings;
  }

  public get pureEcgData(): EcgData {
    return this._pureEcgData;
  }

  public set pureEcgData(data: EcgData) {
    this._pureEcgData = data;
  }

  public get ecgData(): EcgData {
    return this._ecgData;
  }

  public set ecgData(data: EcgData) {
    this._ecgData = data;
  }

  public get analysisData(): AnalysisData {
    return this._analysisData;
  }

  public set analysisData(data: AnalysisData) {
    this._analysisData = data;
  }

  public get updatedAt(): number {
    return this._updatedAt;
  }

  public set updatedAt(value: number) {
    this._updatedAt = value;
  }

  public get createdAt(): number {
    return this._createdAt;
  }

  public set createdAt(value: number) {
    this._createdAt = value;
  }

  public get analysis(): Analysis {
    if (!this.analysisData || !this.analysisData.hasOwnProperty('analysis')) return null;
    return this.analysisData.analysis;
  }

  public get ecgPara(): any {
    if (!this.analysisData || !this.analysisData.hasOwnProperty('ecgPara')) return null;
    return this.analysisData.ecgPara;
  }

  public get mnCode(): MinnesotaCode[] {
    if (!this.analysisData || !this.analysisData.hasOwnProperty('mnCode')) return null;
    return this.analysisData.mnCode;
  }

  get sn(): string {
    return ('000000000' + this.id).slice(-10);
  }

  get fileSN(): string {
    return this.patient.sn && this.patient.sn !== '' && this.patient.sn !== null ? this.patient.sn : this.sn;
  }
}
