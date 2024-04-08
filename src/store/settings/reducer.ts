import { SettingsActions } from './actions';

export interface SettingsState {
  showMinnesotaCode: boolean;
  symptomIndication: boolean;
  highPassFilter: string;
  lowPassFilter: string;
  ACNotchFilter: string;
  EMGFilter: boolean;
}

export const INITIAL_STATE: SettingsState = {
  showMinnesotaCode: false,
  symptomIndication: true,
  highPassFilter: '0',
  lowPassFilter: '70',
  ACNotchFilter: '50',
  EMGFilter: true
};

export const Reducer = (state = INITIAL_STATE, action: any): SettingsState => {
  switch (action.type) {
    case SettingsActions.SET_SETTINGS:
      return { ...state, ...action.settings };
    case SettingsActions.GET_SETTINGS:
      return { ...state, ...action.settings };
    default:
      return state;
  }
};
