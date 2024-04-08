import { RecordsActions } from './actions';
import { Record } from './models';

export interface RecordsState {
  records: Record[];
}

export const INITIAL_STATE: RecordsState = {
  records: []
};

export const Reducer = (state = INITIAL_STATE, action: any): RecordsState => {
  let records: Record[];
  switch (action.type) {
    case RecordsActions.SAVE_RECORD:
      records = Array.from(state.records);
      records.splice(0, 0, action.record);
      return {
        records: records
      };
    case RecordsActions.DELETE_RECORDS:
      records = Array.from(state.records);
      records = records.filter(record => !action.ids.includes(record.id));
      return {
        records: records
      };
    case RecordsActions.LIST_RECORDS:
      return {
        records: action.records
      };
    default:
      return state;
  }
};
