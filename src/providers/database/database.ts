import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { SQLite, SQLiteObject } from '@ionic-native/sqlite';
import * as squel from 'squel';

import { AppProvider } from './../app/app';

@Injectable()
export class DatabaseProvider {
  static readonly DB_VERSION = 1;

  _db: SQLiteObject = null;
  _isReady = false;

  constructor(private storage: Storage, private sqlite: SQLite, private appProvider: AppProvider) {}

  async init() {
    try {
      let version = await this.storage.get('db_version');
      if (version === null) {
        await this.storage.set('db_version', DatabaseProvider.DB_VERSION);
        version = DatabaseProvider.DB_VERSION;
      }
      await this.appProvider.printAndWriteDebugLog('db_version: ' + version);

      this._db = await this.sqlite.create({
        name: 'cardiart.db',
        location: 'default'
      });
      await this.createRecordTable();
      this._isReady = true;
    } catch (e) {
      await this.appProvider.printAndWriteErrorLog(e);
    }
  }

  async createRecordTable() {
    await this._db.executeSql(
      `CREATE TABLE IF NOT EXISTS examination_records (
      'id' INTEGER PRIMARY KEY AUTOINCREMENT,
      'patient' TEXT NOT NULL,
      'settings' TEXT NOT NULL,
      'analysisData' TEXT,
      'updatedAt' NUMERIC,
      'createdAt' NUMERIC)`,
      []
    );
  }

  getLastInsertRowID() {
    return this.sql(s => s.select().field('last_insert_rowid()', 'id'));
  }

  sql(callback) {
    const sql = callback(squel).toString();
    // console.log(sql);
    return this._db.executeSql(sql, []);
  }

  sqliteEscape(sql: string) {
    return sql.replace("'", "''");
  }
}
