import { Injectable } from '@angular/core';
import {
  ToastController,
  ToastOptions,
  LoadingController,
  Loading,
  LoadingOptions,
  Platform,
  AlertController
} from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';

@Injectable()
export class UIProvider {
  private loading: Loading;
  private onLoading: boolean;
  private unregBackCall = null;
  private t: string;

  constructor(
    public platform: Platform,
    public alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private translate: TranslateService
  ) {
    this.translate.get(['COMMON.OK']).subscribe((res: string) => {
      this.t = res;
    });
  }

  presentToast(message, opts?: ToastOptions) {
    const options = opts
      ? opts
      : {
          message: message,
          duration: 1000,
          position: 'middle'
        };

    const toast = this.toastCtrl.create(options);
    toast.present();
    return toast;
  }

  presentLoading(content: string, opts?: LoadingOptions, blockBack: boolean = true) {
    if (this.loading && this.onLoading) {
      this.dismissLoading();
    }

    const options = opts
      ? opts
      : {
          content: content
        };
    this.loading = this.loadingCtrl.create(options);
    if (blockBack) {
      this.unregBackCall = this.platform.registerBackButtonAction(() => {
        //do nothing
      });
    }
    this.loading.onDidDismiss(() => {
      this.unregBackCall && this.unregBackCall();
      this.onLoading = false;
    });
    this.loading.present();
    this.onLoading = true;
  }

  dismissLoading() {
    if (this.loading && this.onLoading) {
      this.loading.dismiss();
      this.loading = null;
    }
  }

  showAlert(title: string, message: string) {
    const confirm = this.alertCtrl.create({
      title: title,
      message: message,
      buttons: [
        {
          text: this.t['COMMON.OK']
        }
      ]
    });
    confirm.present();
  }

  get isLoading() {
    return this.onLoading;
  }
}
