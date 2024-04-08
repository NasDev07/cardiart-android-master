import * as DevicesReducer from './ble-devices/reducer';
import * as SettingsReducer from './settings/reducer';
import * as PatientReducer from './patient/reducer';
import * as RecordsReducer from './records/reducer';
import * as PyBridgeReducer from './pybridge/reducer';
import * as IntentReducer from './intent/reducer';

import { combineReducers } from 'redux';

export interface IAppState {
  bleDevices: DevicesReducer.DeviceState;
  settings: SettingsReducer.SettingsState;
  patient: PatientReducer.PatientState;
  records: RecordsReducer.RecordsState;
  pyBridge: PyBridgeReducer.PyBridgeState;
  intent: IntentReducer.IntentState;
}

export const AppReducer = combineReducers<IAppState>({
  bleDevices: DevicesReducer.Reducer,
  settings: SettingsReducer.Reducer,
  patient: PatientReducer.Reducer,
  records: RecordsReducer.Reducer,
  pyBridge: PyBridgeReducer.Reducer,
  intent: IntentReducer.Reducer
});
