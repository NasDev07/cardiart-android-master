import { DevicesActions } from './actions';
import { BLEDevice } from './models';

export interface DeviceState {
  isScanning: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  isConnectFailed: boolean;
  isReconnecting: boolean;
  foundDevices: BLEDevice[];
  connectingDevice: BLEDevice;
  connectedDevice: BLEDevice;
  isEnabled: boolean;
  isBT5Supported: boolean;
  deviceVersion: string;
}

export const INITIAL_STATE: DeviceState = {
  isScanning: false,
  isConnecting: false,
  isConnected: false,
  isConnectFailed: false,
  isReconnecting: false,
  foundDevices: [],
  connectingDevice: null,
  connectedDevice: null,
  isEnabled: true,
  isBT5Supported: false,
  deviceVersion: ''
};

export const Reducer = (state = INITIAL_STATE, action: any): DeviceState => {
  switch (action.type) {
    case DevicesActions.BT_STATUS:
      return {
        ...state,
        isEnabled: action.btIsEnabled
      };
    case DevicesActions.SCAN_DEVICES:
      return {
        ...state,
        isScanning: true,
        foundDevices: []
      };
    case DevicesActions.FOUND_DEVICES:
      return {
        ...state,
        foundDevices: [...state.foundDevices, action.device]
      };
    case DevicesActions.SCAN_DEVICES_DONE:
      return {
        ...state,
        isScanning: false
      };
    case DevicesActions.CONNECT_DEVICE:
      return {
        ...state,
        connectingDevice: action.device,
        connectedDevice: null,
        isConnecting: true,
        isConnectFailed: false,
        isReconnecting: false
      };
    case DevicesActions.DEVICE_CONNECTED:
      return {
        ...state,
        connectingDevice: null,
        connectedDevice: action.device,
        isConnecting: false,
        isConnected: true,
        isConnectFailed: false,
        isReconnecting: false
      };
    case DevicesActions.DEVICE_DISCONNECTED:
      return {
        ...state,
        connectingDevice: null,
        connectedDevice: null,
        isConnecting: false,
        isConnected: false,
        isConnectFailed: false,
        isReconnecting: false,
        deviceVersion: ''
      };
    case DevicesActions.DEVICE_CONNECT_FAILED:
      return {
        ...state,
        connectingDevice: null,
        connectedDevice: null,
        isConnecting: false,
        isConnected: false,
        isConnectFailed: true,
        isReconnecting: false,
        deviceVersion: ''
      };
    case DevicesActions.DEVICE_RECONNECTING:
      return {
        ...state,
        connectingDevice: null,
        connectedDevice: null,
        isConnecting: false,
        isConnected: false,
        isConnectFailed: false,
        isReconnecting: true,
        deviceVersion: ''
      };
    case DevicesActions.IS_BT5_SUPPORTED:
      return {
        ...state,
        isBT5Supported: action.isBT5Supported
      };
    case DevicesActions.DEVICE_FW_VERSION:
      return {
        ...state,
        deviceVersion: action.version
      };
    default:
      return state;
  }
};
