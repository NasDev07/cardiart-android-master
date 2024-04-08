import { Injectable } from '@angular/core';
import { NgRedux } from '@angular-redux/store';
import { Storage } from '@ionic/storage';
import { IAppState } from '..';
import { IntentState } from './reducer';

@Injectable()
export class IntentActions {
  static SET_INTENT_DATA = 'SET_INTENT_DATA';
  static CLEAR_INTENT_DATA = 'CLEAR_INTENT_DATA';

  constructor(private ngRedux: NgRedux<IAppState>, private storage: Storage) {}

  async isNewIntent(extraData: any) {
    try {
      const oldExtraData = await this.storage.get('intent_extra_data');
      if (JSON.stringify(extraData) !== JSON.stringify(oldExtraData)) {
        await this.storage.set('intent_extra_data', extraData);
        return true;
      }
    } catch (error) {}

    return false;
  }

  setData(data: IntentState) {
    this.ngRedux.dispatch({ type: IntentActions.SET_INTENT_DATA, data });
  }

  clearData() {
    this.ngRedux.dispatch({ type: IntentActions.CLEAR_INTENT_DATA });
  }
}
