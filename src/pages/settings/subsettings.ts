import { select } from '@angular-redux/store';
import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { NavController, NavParams } from 'ionic-angular';
import { Observable } from 'rxjs/Observable';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs/Subject';

import { SettingsActions } from '../../store/settings/actions';
import { SettingsState } from '../../store/settings/reducer';

@Component({
  selector: 'page-subsettings',
  templateUrl: 'subsettings.html'
})
export class SubSettingsPage {
  @select() readonly settings$: Observable<SettingsState>;

  settingsState: SettingsState;

  selectedItem: string;
  group: number;
  filter: any;
  onDestroy$ = new Subject<void>();
  t: string;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private translate: TranslateService,
    private settingsActions: SettingsActions
  ) {
    this.translate
      .get(['SETTINGS.DISPLAY_MINNESOTA_CODE', 'SETTINGS.SYMPTOM_INDICATION', 'SETTINGS.OFF'])
      .subscribe((res: string) => {
        this.t = res;
      });
    this.group = navParams.get('group');
    this.filter = navParams.get('filter');
  }

  ionViewDidLoad() {
    this.settings$.pipe(takeUntil(this.onDestroy$)).subscribe((state: SettingsState) => {
      this.settingsState = state;
      if (this.group === 1) {
        switch (this.filter.id) {
          case 0:
            this.selectedItem = this.settingsState.highPassFilter;
            break;
          case 1:
            this.selectedItem = this.settingsState.lowPassFilter;
            break;
          case 2:
            this.selectedItem = this.settingsState.ACNotchFilter;
            break;
        }

        if (this.selectedItem === 'OFF') {
          this.selectedItem = this.t['SETTINGS.OFF'];
        }
      }
    });
    this.settingsActions.getSettings();
  }

  ionViewWillUnload() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  onSwitchChange(id: number, event: boolean) {
    switch (id) {
      case 0:
        this.settingsState.showMinnesotaCode = event;
        break;
      case 1:
        this.settingsState.symptomIndication = event;
        break;
    }
    this.settingsActions.saveSettings(this.settingsState);
  }

  onFilterChange(event: string) {
    switch (this.filter.id) {
      case 0:
        this.settingsState.highPassFilter = event;
        break;
      case 1:
        this.settingsState.lowPassFilter = event;
        break;
      case 2:
        this.settingsState.ACNotchFilter = event;
        break;
    }
    this.settingsActions.saveSettings(this.settingsState);
  }
}
