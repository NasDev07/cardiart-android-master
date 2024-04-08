import { select } from '@angular-redux/store';
import { Component, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {
  AlertController,
  Content,
  MenuController,
  NavController,
  NavParams,
  Platform
} from 'ionic-angular';
import { Observable } from 'rxjs/Observable';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs/Subject';

import { UtilProvider } from '../../providers/util/util';
import { AppProvider } from './../../providers/app/app';
import { RecordsActions } from '../../store/records/actions';
import { Record } from '../../store/records/models';
import { RecordsState } from '../../store/records/reducer';
import { RecordDetailPage } from '../record-detail/record-detail';
import { NotSelectedPage } from './not-selected';

@Component({
  selector: 'page-records',
  templateUrl: 'records.html'
})
export class RecordsPage {
  @select() readonly records$: Observable<RecordsState>;

  @ViewChild('nav') nav: NavController;
  @ViewChild(Content) content: Content;

  onDestroy$ = new Subject<void>();

  records: Record[];
  recordsChecked = [];
  isEditable: boolean = false;
  t: string;
  rootPage = NotSelectedPage;

  constructor(
    public platform: Platform,
    public navCtrl: NavController,
    public navParams: NavParams,
    public menuCtrl: MenuController,
    public alertCtrl: AlertController,
    private translate: TranslateService,
    private util: UtilProvider,
    private appProvider: AppProvider,
    private recordsActions: RecordsActions
  ) {
    this.translate
      .get([
        'RECORDS.EDIT',
        'RECORDS.CANCEL',
        'RECORDS.DELETE',
        'RECORDS.DELETE_CONFIRM_TITLE',
        'RECORDS.DELETE_CONFIRM_MESSAGE'
      ])
      .subscribe((res: string) => {
        this.t = res;
      });
  }

  ionViewDidLoad() {
    this.records$.pipe(takeUntil(this.onDestroy$)).subscribe((state: RecordsState) => {
      this.records = state.records;
    });
    this.recordsActions.getRecords();

    this.menuCtrl.open();
  }

  ionViewWillUnload() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  editOrCancel() {
    this.isEditable = !this.isEditable;
    if (!this.isEditable) this.recordsChecked.length = 0;
    this.content.resize();
  }

  getEditString() {
    if (this.isEditable) return this.t['RECORDS.CANCEL'];
    else return this.t['RECORDS.EDIT'];
  }

  getItemTitle(record: Record) {
    const patient = record.patient;
    const str = `[${record.fileSN}] ${this.util.getPatientName(patient.name)}.${this.util.getPatientSex(
      patient.sex,
      false
    )}.${this.util.getPatientAge(patient.age, 1)}`;
    return str;
  }

  itemSelected(record: Record) {
    if (this.platform.is('tablet')) {
      this.nav.setRoot(RecordDetailPage, {
        record: record
      });
    } else {
      this.navCtrl.push(RecordDetailPage, {
        record: record
      });
    }
  }

  onRecordCheck(record: Record, evt: any) {
    if (evt.checked) {
      this.recordsChecked.push(record);
    } else {
      const index = this.recordsChecked.indexOf(record);
      this.recordsChecked.splice(index, 1);
    }
  }

  confirmDelete() {
    const confirm = this.alertCtrl.create({
      title: this.t['RECORDS.DELETE_CONFIRM_TITLE'],
      message: this.t['RECORDS.DELETE_CONFIRM_MESSAGE'],
      cssClass: 'alert-confirm',
      buttons: [
        {
          text: this.t['RECORDS.CANCEL'],
          role: 'cancel',
          handler: () => {}
        },
        {
          text: this.t['RECORDS.DELETE'],
          handler: () => {
            this.deleteRecords();
          }
        }
      ]
    });
    confirm.present();
  }

  async deleteRecords() {
    try {
      await this.recordsActions.deleteRecords(this.recordsChecked);
      this.recordsChecked.length = 0;
      this.isEditable = false;
      this.content.resize();
    } catch (e) {
      await this.appProvider.printAndWriteErrorLog(e);
    }
  }
}
