import { NgRedux } from '@angular-redux/store';
import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';

import { IAppState } from '../../store';
import { PatientState } from './reducer';

@Injectable()
export class PatientActions {
  static SAVE_PROFILE = 'SAVE_PROFILE';
  static GET_PROFILE = 'GET_PROFILE';

  private storage: Storage;

  constructor(private ngRedux: NgRedux<IAppState>) {
    this.storage = new Storage({
      storeName: 'Patient'
    });
  }

  async saveProfile(profile: PatientState) {
    await this.storage.set('profile', profile);
    this.ngRedux.dispatch({ type: PatientActions.SAVE_PROFILE, profile });
  }

  async getProfile() {
    let profile = await this.storage.get('profile');
    if (profile) {
      this.ngRedux.dispatch({ type: PatientActions.GET_PROFILE, profile });
    }
  }
}
