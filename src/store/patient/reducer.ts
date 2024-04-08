import { PatientActions } from './actions';

export interface PatientState {
  sn: string;
  name: string;
  id: string;
  sex: string;
  age: string;
  note: string;
}

export const INITIAL_STATE: PatientState = {
  sn: null,
  name: null,
  id: null,
  sex: 'U', // F/M/U
  age: null,
  note: null
};

export const Reducer = (state = INITIAL_STATE, action: any): PatientState => {
  switch (action.type) {
    case PatientActions.SAVE_PROFILE:
      return { ...state, ...action.profile };
    case PatientActions.GET_PROFILE:
      return { ...state, ...action.profile };
    default:
      return state;
  }
};
