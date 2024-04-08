import { Injectable } from '@angular/core';

@Injectable()
export class ConvertService {
  constructor() {}

  coerceBoolean(value: any): boolean {
    return value != null && `${value}` !== 'false';
  }

  coerceNumber(value: any, fallbackValue = 0) {
    return this.isNumberValue(value) ? Number(value) : fallbackValue;
  }

  /** Wraps the provided value in an array, unless the provided value is an array. */
  coerceArray<T>(value: T | T[]): T[] {
    return Array.isArray(value) ? value : [value];
  }

  /**
   * Whether the provided value is considered a number.
   * @docs-private
   */
  isNumberValue(value: any): boolean {
    // parseFloat(value) handles most of the cases we're interested in (it treats null, empty string,
    // and other non-number values as NaN, where Number just uses 0) but it considers the string
    // '123hello' to be a valid number. Therefore we also check if Number(value) is NaN.
    return !isNaN(parseFloat(value as any)) && !isNaN(Number(value));
  }

  stringToHex(str: string) {
    let hex = '';

    for (let i = 0; i < str.length; i++) {
      hex += '' + str.charCodeAt(i).toString(16);
    }
    return hex;
  }

  intToHex(val: number, totalBits, isLittleEndian = false) {
    let hex = val.toString(16);
    let padding = totalBits; //16bit

    while (hex.length < padding) {
      hex = '0' + hex;
    }

    if (isLittleEndian) {
      let str = '';
      for (let i = 0; i < hex.length; i += 2) {
        str = hex.substring(i, i + 2) + str;
      }
      return str;
    } else {
      return hex;
    }
  }

  convert(num, baseFrom, baseTo) {
    return parseInt(num, baseFrom).toString(baseTo);
  }

  hexStringToByte(str) {
    let a = [];
    for (let i = 0; i < str.length; i += 2) {
      a.push(parseInt(str.substr(i, 2), 16));
    }

    return new Uint8Array(a);
  }
}
