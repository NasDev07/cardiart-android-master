import { Injectable } from '@angular/core';
import { File, IWriteOptions } from '@ionic-native/file';

@Injectable()
export class FileUtilProvider {
  constructor(private file: File) {}

  async writeFile(path: string, fileName: string, text: string | Blob | ArrayBuffer, options?: IWriteOptions) {
    await this.createFileIfNotExist(path, fileName);
    await this.file.writeFile(path, fileName, text, options);
  }

  async createDirIfNotExist(path: string, dir: string) {
    try {
      await this.file.checkDir(path, dir);
    } catch (e) {
      dir = dir.charAt(dir.length - 1) === '/' ? dir.substring(0, dir.length - 1) : dir;
      const dirParts = dir.split('/');
      let currentDirPath = '';
      while (dirParts.length > 0) {
        const currentDir = dirParts.shift();
        currentDirPath = currentDirPath + currentDir + '/';
        try {
          await this.file.checkDir(path, currentDirPath);
        } catch (e) {
          await this.file.createDir(path, currentDirPath, false);
        }
      }
    }
  }

  async createFileIfNotExist(path: string, fileName: string) {
    try {
      await this.file.checkFile(path, fileName);
    } catch (e) {
      const dirParts = fileName.split('/');
      let currentDirPath = '';
      while (dirParts.length > 1) {
        const currentDir = dirParts.shift();
        currentDirPath = currentDirPath + currentDir + '/';
        try {
          await this.file.checkDir(path, currentDirPath);
        } catch (e) {
          await this.file.createDir(path, currentDirPath, false);
        }
      }

      await this.file.createFile(path, fileName, false);
    }
  }

  async removeFileIfExist(path: string, fileName: string) {
    try {
      await this.file.checkFile(path, fileName);
      await this.file.removeFile(path, fileName);
    } catch (e) {}
  }
}
