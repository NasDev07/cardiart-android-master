export interface Filter {
  bvalid0: boolean;
  bvalid1: boolean;
  a0: number[];
  b0: number[];
  a1: number[];
  b1: number[];
}

export interface HeartRate {
  heartRate: number;
}

export interface AnalysisData {
  analysis: Analysis;
  ecgPara: any;
  mnCode: MinnesotaCode[];
}

export interface Analysis {
  diseaseCase: number;
  diseaseName: string;
}

export interface MinnesotaCode {
  desc: string;
  name: string;
}
