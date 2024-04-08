import { IntentActions } from './actions';

export interface IntentState {
  vendorId: string;
  vendorName: string;
  filename: string;
  format: number;
}

export const INITIAL_STATE: IntentState = {
  vendorId: null,
  vendorName: null,
  filename: null,
  format: 1
};

export const Reducer = (state = INITIAL_STATE, action: any): IntentState => {
  switch (action.type) {
    case IntentActions.SET_INTENT_DATA:
      return { ...state, ...action.data };
    case IntentActions.CLEAR_INTENT_DATA:
      return { ...INITIAL_STATE };
    default:
      return state;
  }
};
