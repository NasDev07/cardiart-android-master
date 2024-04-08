import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable()
export class UtilProvider {
  constructor(private translate: TranslateService) {}

  getPatientName(name: string): string {
    if (name) return name;
    else return this.translate.instant('PATIENT.UNKNOWN');
  }

  getPatientAge(age: string, type: number): string {
    switch (type) {
      case 0:
        if (age) return age;
        else return '0';
      case 1:
        if (age) return age + this.translate.instant('PATIENT.YEARS_OLD');
        else return this.translate.instant('PATIENT.UNKNOWN');
    }
  }

  getPatientSex(sex: string, allowEmpty: boolean): string {
    switch (sex) {
      case 'M':
        return this.translate.instant('PATIENT.MALE');
      case 'F':
        return this.translate.instant('PATIENT.FEMALE');
      case 'U':
        if (!allowEmpty) return this.translate.instant('PATIENT.UNKNOWN');
        else return '';
    }
  }

  getDateTime(date: number, type: number): string {
    const time = new Date(date);
    let Y = time.getFullYear();
    let Mon: any = time.getMonth() + 1;
    Mon = Mon < 10 ? `0${Mon}` : Mon;
    let D: any = time.getDate();
    D = D < 10 ? `0${D}` : D;
    let H: any = time.getHours();
    H = H < 10 ? `0${H}` : H;
    let Min: any = time.getMinutes();
    Min = Min < 10 ? `0${Min}` : Min;
    let S: any = time.getSeconds();
    S = S < 10 ? `0${S}` : S;

    let dateStr: string;
    switch (type) {
      case 0:
        dateStr = `${Y}-${Mon}-${D} ${H}:${Min}:${S}`;
        break;
      case 1:
        dateStr = `${Y}${Mon}${D}${H}${Min}${S}`;
        break;
      case 2:
        dateStr = `${Y}-${Mon}-${D}`;
        break;
      case 3:
        dateStr = `${H}:${Min}:${S}`;
        break;
    }
    return dateStr;
  }

  isASCII(text: string): boolean {
    for (let i = 0; i < text.length; i++) {
      if (text.charCodeAt(i) > 127) {
        return false;
      }
    }
    return true;
  }
}
