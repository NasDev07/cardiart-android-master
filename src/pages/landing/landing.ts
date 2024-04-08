import { Component } from '@angular/core';
import { NavController, NavParams, Platform } from 'ionic-angular';
import { AppVersion } from '@ionic-native/app-version';

@Component({
  selector: 'page-landing',
  templateUrl: 'landing.html'
})
export class LandingPage {
  appVersion: string;

  constructor(
    public platform: Platform,
    public navCtrl: NavController,
    public navParams: NavParams,
    private appVersionPlugin: AppVersion
  ) {
    platform.ready().then(() => {
      this.appVersionPlugin.getVersionNumber().then(version => {
        this.appVersion = `v${version}`;
      });
    });
  }
}
