import { EcgConfig } from '../models/ecg';

export const DEFAULT_ECG_CONFIG: EcgConfig = {
  maxMillivolt: 1.5,
  baseLengthPerSec: 12.5,
  baseLengthPerMilliVolt: 5
};