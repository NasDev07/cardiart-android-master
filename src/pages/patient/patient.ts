import { select } from '@angular-redux/store';
import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { BarcodeScanner, BarcodeScannerOptions } from '@ionic-native/barcode-scanner';
import { TranslateService } from '@ngx-translate/core';
import { NavController, NavParams } from 'ionic-angular';
import { Observable } from 'rxjs/Observable';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs/Subject';

import { UIProvider } from '../../providers/ui/ui';
import { AppProvider } from '../../providers/app/app';
import { PatientActions } from '../../store/patient/actions';
import { INITIAL_STATE, PatientState } from '../../store/patient/reducer';
import { IdValidator } from '../../validators/id.validator';

@Component({
  selector: 'page-patient',
  templateUrl: 'patient.html'
})
export class PatientPage {
  @select() readonly patient$: Observable<PatientState>;

  patientState: PatientState;

  profileForm: FormGroup;
  validationMessages: any;
  t: any;
  canGoBack = true;
  onDestroy$ = new Subject<void>();

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public formBuilder: FormBuilder,
    private translate: TranslateService,
    private barcodeScanner: BarcodeScanner,
    private patientActions: PatientActions,
    private uiProvider: UIProvider,
    private appProvider: AppProvider
  ) {
    this.translate
      .get([
        'BARCODE.PROMPT_MESSAGE',
        'BARCODE.BARCODE_NOT_SUPPORT',
        'BARCODE.BARCODE_FORMAT_NOT_CORRECT',
        'MESSAGES.SERIAL_NUMBER_REQUIRED',
        'MESSAGES.SERIAL_NUMBER_MAX_LENGTH',
        'MESSAGES.NAME_MAX_LENGTH',
        'MESSAGES.AGE_MAX_LENGTH',
        'MESSAGES.NOTE_MAX_LENGTH',
        'MESSAGES.INVALID_ID'
      ])
      .subscribe((res: string) => {
        this.t = res;
      });

    this.initForm();
  }

  ionViewDidLoad() {
    this.patient$.pipe(takeUntil(this.onDestroy$)).subscribe((state: PatientState) => {
      this.patientState = { ...state };
      this.profileForm.setValue(this.patientState);
    });
  }

  ionViewWillUnload() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  ionViewCanLeave() {
    const canGoBack = this.canGoBack;
    this.canGoBack = true;
    return canGoBack;
  }

  initForm() {
    this.profileForm = this.formBuilder.group({
      sn: new FormControl('', [Validators.required, Validators.maxLength(20)]),
      name: new FormControl('', [Validators.maxLength(70)]),
      id: new FormControl('', [IdValidator.validId]),
      sex: new FormControl(''),
      age: new FormControl('', [Validators.maxLength(3)]),
      note: new FormControl('', [Validators.maxLength(300)])
    });
    this.validationMessages = {
      sn: [
        {
          type: 'required',
          message: this.t['MESSAGES.SERIAL_NUMBER_REQUIRED']
        },
        {
          type: 'maxlength',
          message: this.t['MESSAGES.SERIAL_NUMBER_MAX_LENGTH']
        }
      ],
      name: [
        {
          type: 'maxlength',
          message: this.t['MESSAGES.NAME_MAX_LENGTH']
        }
      ],
      id: [
        {
          type: 'invalidId',
          message: this.t['MESSAGES.INVALID_ID']
        }
      ],
      age: [
        {
          type: 'maxlength',
          message: this.t['MESSAGES.AGE_MAX_LENGTH']
        }
      ],
      note: [
        {
          type: 'maxlength',
          message: this.t['MESSAGES.NOTE_MAX_LENGTH']
        }
      ]
    };

    this.profileForm.get('id').statusChanges.subscribe(status => {
      if (status === 'VALID') {
        this.checkSex(this.profileForm.get('id').value);
      }
    });
  }

  async done() {
    if (this.profileForm.valid) {
      await this.patientActions.saveProfile(this.profileForm.value);
      this.navCtrl.pop();
    }
  }

  async clean() {
    const patient = { ...INITIAL_STATE };
    this.profileForm.reset(patient);
    await this.patientActions.saveProfile(this.profileForm.value);
  }

  scan() {
    this.canGoBack = false;
    const options: BarcodeScannerOptions = {
      showTorchButton: true,
      prompt: this.t['BARCODE.PROMPT_MESSAGE']
    };
    this.barcodeScanner
      .scan(options)
      .then(barcodeData => {
        if (barcodeData.cancelled || barcodeData.text.length === 0) return;

        if (barcodeData.format !== 'QR_CODE' && barcodeData.format !== 'CODE_128') {
          this.uiProvider.showAlert(
            this.t['BARCODE.BARCODE_NOT_SUPPORT'],
            this.t['BARCODE.BARCODE_FORMAT_NOT_CORRECT']
          );
        } else {
          this.profileForm.patchValue({ id: barcodeData.text });
        }
      })
      .catch(err => {
        this.appProvider.printAndWriteErrorLog(err);
      });
  }

  checkSex(id: string) {
    if (!id || id.search(/^[A-Z](1|2)\d{8}$/i) == -1) return;

    let sex: String;
    switch (id.charAt(1)) {
      case '1':
        sex = 'M';
        break;
      case '2':
        sex = 'F';
        break;
      default:
        sex = 'U';
        break;
    }
    this.profileForm.patchValue({ sex: sex });
  }
}
