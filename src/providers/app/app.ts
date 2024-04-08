import { Injectable } from '@angular/core';
import { AppVersion } from '@ionic-native/app-version';
import { Storage } from '@ionic/storage';
import { File } from '@ionic-native/file';
import * as moment from 'moment';

import { FileUtilProvider } from './../util/fileUtil';
import * as AppConstant from '../../constants/app';

@Injectable()
export class AppProvider {
  constructor(
    private appVersionPlugin: AppVersion,
    private storage: Storage,
    private file: File,
    private fileUtil: FileUtilProvider
  ) {}

  async isDevMode(): Promise<boolean> {
    let isDevMode = false;
    try {
      const version = await this.appVersionPlugin.getVersionNumber();
      isDevMode = version.split('.')[2] !== '0';
    } catch (e) {}

    return isDevMode;
  }

  async setDebugMode(value: boolean) {
    await this.storage.set('isDebugMode', value);
  }

  async isDebugEnabled() {
    let isDevMode = false;
    let isDebugMode = false;
    try {
      isDebugMode = await this.storage.get('isDebugMode');
      isDevMode = await this.isDevMode();
    } catch (error) {}

    return isDebugMode && isDevMode;
  }

  async printAndWriteDebugLog(message: string) {
    console.log(message);
    const datetime = moment().format();
    message = `[${datetime}] ${message}\n`;
    await this.writeLogFile(message);
  }

  async printAndWriteErrorLog(error: any) {
    console.error(error);
    const datetime = moment().format();
    const message = `[${datetime}] ${JSON.stringify(error)}\n`;
    await this.writeLogFile(message);
  }

  async writeLogFile(message: string) {
    try {
      const fileName = `${AppConstant.LOG_DIRECTORY_PATH}${moment().format('YYYYMMDD')}.log`;
      await this.fileUtil.writeFile(`${this.file.externalRootDirectory}`, fileName, message, {
        replace: false,
        append: true
      });
    } catch (error) {
      console.error('Write log failed', error);
    }
  }
}
