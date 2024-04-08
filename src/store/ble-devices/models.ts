export interface BLEDevice {
  advertising: ArrayBuffer;
  id: string;
  name: string;
  rssi: number;
}
