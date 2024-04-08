import { FormControl } from '@angular/forms';

export class IdValidator {
  static validId(formControl: FormControl): any {
    if (!formControl.value || formControl.value.length < 1) {
      return null;
    }

    const result = IdValidator.checkID(formControl.value);
    return result ? null : { invalidId: true };
  }

  static checkID(id: string) {
    const letters = 'ABCDEFGHJKLMNPQRSTUVXYWZIO';
    const A1 = new Array(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3);
    const A2 = new Array(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5);
    const multiply = new Array(9, 8, 7, 6, 5, 4, 3, 2, 1, 1);

    if (!id || id.search(/^[A-Z](1|2)\d{8}$/i) == -1) return false;

    const letterIndex = letters.indexOf(id.charAt(0));
    if (letterIndex == -1) return false;
    let sum = A1[letterIndex] + A2[letterIndex] * 9;
    for (let i = 1; i < 10; i++) {
      let v = parseInt(id.charAt(i));
      if (isNaN(v)) return false;
      sum = sum + v * multiply[i];
    }
    if (sum % 10 != 0) return false;
    return true;
  }
}
