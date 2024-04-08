import { Injectable } from '@angular/core';
import { NgRedux } from '@angular-redux/store';
import { File } from '@ionic-native/file';
import { Squel } from 'squel';

import { DatabaseProvider } from './../../providers/database/database';
import { AppProvider } from './../../providers/app/app';
import { IAppState } from '../../store';
import { Record } from './models';

@Injectable()
export class RecordsActions {
  static SAVE_RECORD = 'SAVE_RECORD';
  static LIST_RECORDS = 'LIST_RECORDS';
  static DELETE_RECORDS = 'DELETE_RECORDS';

  constructor(
    private ngRedux: NgRedux<IAppState>,
    private file: File,
    private dbProvider: DatabaseProvider,
    private appProvider: AppProvider
  ) {}

  async saveRecord(record: Record) {
    try {
      const time = Date.now();
      const dataField = this.dbProvider.sqliteEscape(JSON.stringify(record.analysisData));
      if (!dataField) {
        await this.appProvider.printAndWriteErrorLog('sqlite escape failed');
      }
      const result = await this.dbProvider.sql((s: Squel) =>
        s
          .insert()
          .into('examination_records')
          .set('patient', JSON.stringify(record.patient))
          .set('settings', JSON.stringify(record.settings))
          .set('analysisData', dataField)
          .set('updatedAt', time)
          .set('createdAt', time)
      );
      record.id = result.insertId;
      const sn = record.sn;
      await this.file.writeFile(this.file.dataDirectory, `${sn}-pure.json`, JSON.stringify(record.pureEcgData), {
        replace: true
      });
      await this.file.writeFile(this.file.dataDirectory, `${sn}.json`, JSON.stringify(record.ecgData), {
        replace: true
      });
      await this.appProvider.printAndWriteDebugLog(`save record ${record.fileSN} success`);

      this.ngRedux.dispatch({
        type: RecordsActions.SAVE_RECORD,
        record
      });

      return true;
    } catch (e) {
      await this.appProvider.printAndWriteErrorLog(e);
      return false;
    }
  }

  async getRecords() {
    let records = [];
    try {
      const data = await this.dbProvider.sql((s: Squel) =>
        s
          .select()
          .from('examination_records')
          .order('id', false)
      );
      if (data.rows.length > 0) {
        for (var i = 0; i < data.rows.length; i++) {
          const record = new Record();
          record.id = data.rows.item(i).id;
          record.patient = JSON.parse(String(data.rows.item(i).patient || null));
          record.settings = JSON.parse(String(data.rows.item(i).settings || null));
          record.ecgData = JSON.parse(String(data.rows.item(i).ecgData || null));
          record.analysisData = JSON.parse(String(data.rows.item(i).analysisData || null));
          record.updatedAt = data.rows.item(i).updatedAt;
          record.createdAt = data.rows.item(i).createdAt;
          records.push(record);
        }
      }
    } catch (e) {
      await this.appProvider.printAndWriteErrorLog(e);
    }

    this.ngRedux.dispatch({
      type: RecordsActions.LIST_RECORDS,
      records
    });
  }

  async deleteRecords(records: Record | Record[]) {
    try {
      if (!Array.isArray(records)) records = [records];

      const recordIds = records.map(record => record.id);
      const ids = recordIds.join(',');

      await this.dbProvider.sql((s: Squel) =>
        s
          .delete()
          .from('examination_records')
          .where(`id IN (${ids})`)
      );

      records.forEach(record => this.removeRecordFiles(record));

      this.ngRedux.dispatch({
        type: RecordsActions.DELETE_RECORDS,
        ids: recordIds
      });
    } catch (e) {
      await this.appProvider.printAndWriteErrorLog(e);
    }
  }

  async removeRecordFiles(record: Record) {
    try {
      await this.file.removeFile(this.file.dataDirectory, `${record.sn}-pure.json`);
    } catch (error) {
      await this.appProvider.printAndWriteErrorLog(`Remove ${record.sn}-pure.json failed`);
      await this.appProvider.printAndWriteErrorLog(error);
    }
    try {
      await this.file.removeFile(this.file.dataDirectory, `${record.sn}.json`);
    } catch (error) {
      await this.appProvider.printAndWriteErrorLog(`Remove ${record.sn}.json failed`);
      await this.appProvider.printAndWriteErrorLog(error);
    }
  }
}
