import { PyBridgeActions } from './actions';

export interface PyBridgeState {
  isReady: boolean;
  isRunning: boolean;
}

export const INITIAL_STATE: PyBridgeState = {
  isReady: false,
  isRunning: false
};

export const Reducer = (state = INITIAL_STATE, action: any): PyBridgeState => {
  switch (action.type) {
    case PyBridgeActions.INITIALIZE:
      return { ...state, isReady: action.isReady };
    case PyBridgeActions.RUNNING_STATUS:
      return { ...state, isRunning: action.isRunning };
    default:
      return state;
  }
};
