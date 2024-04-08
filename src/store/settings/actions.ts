import { NgRedux } from '@angular-redux/store';
import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';

import { IAppState } from '../../store';
import { SettingsState } from './reducer';

@Injectable()
export class SettingsActions {
  static SET_SETTINGS = 'SET_SETTINGS';
  static GET_SETTINGS = 'GET_SETTINGS';

  private storage: Storage;

  constructor(private ngRedux: NgRedux<IAppState>) {
    this.storage = new Storage({
      storeName: 'Settings'
    });
  }

  async saveSettings(settings: SettingsState) {
    await this.storage.set('settings', settings);
    this.ngRedux.dispatch({ type: SettingsActions.SET_SETTINGS, settings });
  }

  async getSettings() {
    let settings = await this.storage.get('settings');
    if (settings) {
      this.ngRedux.dispatch({
        type: SettingsActions.GET_SETTINGS,
        settings
      });
    }
  }
}
