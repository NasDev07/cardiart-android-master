export interface EcgConfig {
  bytesPerSample?: number;
  maxMillivolt: number;
  baseLengthPerSec?: number; //mm
  baseLengthPerMilliVolt?: number; //mm
}

export class EcgLead {
  constructor(
    public pointName: string | string[],
    public data: number[],
    public savedPureData?: number[],
    public savedData?: number[],
    public leadOff?: boolean
  ) {}

  clearAll() {
    this.clearData();
    this.clearSavedData();
  }

  clearData() {
    this.data.splice(0);
  }

  clearSavedData() {
    this.savedPureData.splice(0);
    this.savedData.splice(0);
  }

  static newInstance(
    pointName: string | string[],
    data: number[] = [],
    savedPureData: number[] = [],
    savedData: number[] = [],
    leadOff: boolean = false
  ) {
    return new EcgLead(pointName, data, savedPureData, savedData, leadOff);
  }

  static fromJson(pointName: string | string[], channelData?: string) {
    let data = [];
    if (channelData) {
      data = channelData.split(',').map(item => {
        return parseInt(item, 10);
      });
    }

    return new EcgLead(pointName, data);
  }
}
