import { NgRedux } from '@angular-redux/store';
import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { Platform } from 'ionic-angular';

import { AppProvider } from './../../providers/app/app';
import { IAppState } from '../../store';
import { Filter, HeartRate, AnalysisData } from './models';

declare var pybridge: any;

@Injectable()
export class PyBridgeActions {
  static INITIALIZE = 'INITIALIZE';
  static RUNNING_STATUS = 'RUNNING_STATUS';

  private _ecgModuleVersion = '1.0.25';

  constructor(
    public platform: Platform,
    private storage: Storage,
    private ngRedux: NgRedux<IAppState>,
    private appProvider: AppProvider
  ) {}

  get ecgModuleVersion(): Promise<string> {
    return new Promise(async resolve => {
      let ecgVersion = '';
      try {
        const version: string = await this.storage.get('ecg_module_version');
        const sub = version.split('.');
        ecgVersion = `${sub[0]}.${sub[1]}.${sub[2]}`;
      } catch (e) {
        await this.appProvider.printAndWriteErrorLog(`Can't get ecg module version`);
        await this.appProvider.printAndWriteErrorLog(e);
      }

      resolve(ecgVersion);
    });
  }

  async initialize(): Promise<void> {
    try {
      const version = await this.storage.get('ecg_module_version');
      await this.appProvider.printAndWriteDebugLog('ecg_module_version: ' + version);
      if (version === null || version !== this._ecgModuleVersion) {
        await this.appProvider.printAndWriteDebugLog('Upgrade ECG module');
        await this.extractPython();
        await this.storage.set('ecg_module_version', this._ecgModuleVersion);
        await this.appProvider.printAndWriteDebugLog('New ecg_module_version: ' + this._ecgModuleVersion);
      }
      await this.start();
      this.ngRedux.dispatch({
        type: PyBridgeActions.INITIALIZE,
        isReady: true
      });
    } catch (e) {
      await this.appProvider.printAndWriteErrorLog('PyBridge initial failed');
      await this.appProvider.printAndWriteErrorLog(e);
      this.ngRedux.dispatch({
        type: PyBridgeActions.INITIALIZE,
        isReady: false
      });
    }
  }

  extractPython(): Promise<void> {
    return new Promise((resolve, reject) => {
      pybridge.extractPython(
        () => {
          this.appProvider.printAndWriteDebugLog('extractPython done');
          resolve();
        },
        err => {
          this.appProvider.printAndWriteErrorLog('extractPython failed');
          reject(err);
        }
      );
    });
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      pybridge.start(
        () => resolve(),
        err => reject(err)
      );
    });
  }

  getFilterParas(
    outputFile: string,
    sampleRate: number,
    highpass: string,
    lowpass: string,
    baseline: string,
    notch: string,
    muscle: string
  ): Promise<Filter> {
    return new Promise((resolve, reject) => {
      this.ngRedux.dispatch({
        type: PyBridgeActions.RUNNING_STATUS,
        isRunning: true
      });
      pybridge.genFilter(
        outputFile,
        sampleRate,
        highpass,
        lowpass,
        baseline,
        notch,
        muscle,
        (msg: string) => {
          this.ngRedux.dispatch({
            type: PyBridgeActions.RUNNING_STATUS,
            isRunning: false
          });
          if (msg) resolve(JSON.parse(msg));
          else resolve(null);
        },
        (err: any) => {
          this.ngRedux.dispatch({
            type: PyBridgeActions.RUNNING_STATUS,
            isRunning: false
          });
          reject(err);
        }
      );
    });
  }

  getHeartRate(dataPath: string, logPath: string, debugPath: string, outputPath: string): Promise<HeartRate> {
    return new Promise((resolve, reject) => {
      this.ngRedux.dispatch({
        type: PyBridgeActions.RUNNING_STATUS,
        isRunning: true
      });
      pybridge.analyze(
        '4',
        dataPath,
        logPath,
        debugPath,
        outputPath,
        (msg: string) => {
          this.ngRedux.dispatch({
            type: PyBridgeActions.RUNNING_STATUS,
            isRunning: false
          });
          if (msg) resolve(JSON.parse(msg));
          else resolve(null);
        },
        err => {
          this.ngRedux.dispatch({
            type: PyBridgeActions.RUNNING_STATUS,
            isRunning: false
          });
          reject(err);
        }
      );
    });
  }

  analyzeECG(dataPath: string, logPath: string, debugPath: string, outputPath: string): Promise<AnalysisData> {
    return new Promise((resolve, reject) => {
      this.ngRedux.dispatch({
        type: PyBridgeActions.RUNNING_STATUS,
        isRunning: true
      });
      pybridge.analyze(
        '0',
        dataPath,
        logPath,
        debugPath,
        outputPath,
        (msg: string) => {
          this.ngRedux.dispatch({
            type: PyBridgeActions.RUNNING_STATUS,
            isRunning: false
          });
          if (msg) resolve(JSON.parse(msg));
          else resolve(null);
        },
        err => {
          this.ngRedux.dispatch({
            type: PyBridgeActions.RUNNING_STATUS,
            isRunning: false
          });
          reject(err);
        }
      );
    });
  }
}
