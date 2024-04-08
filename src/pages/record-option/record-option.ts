import { Component } from '@angular/core';
import { NavController, NavParams, ViewController } from 'ionic-angular';
import { AppProvider } from '../../providers/app/app';

@Component({
  selector: 'page-record-option',
  templateUrl: 'record-option.html'
})
export class RecordOptionPage {
  isDebugEnabled: boolean = false;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public viewCtrl: ViewController,
    private appProvider: AppProvider
  ) {}

  ionViewDidLoad() {
    this.appProvider.isDebugEnabled().then((value: boolean) => {
      this.isDebugEnabled = value;
    });
  }

  select(type: String) {
    this.viewCtrl.dismiss(type);
  }
}
