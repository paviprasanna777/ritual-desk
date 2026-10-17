import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alarmOutline, flameOutline } from 'ionicons/icons';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  template: `
    <ion-content class="rd-page-content">
      <main class="rd-page-padding">
        <app-page-header eyebrow="RitualDesk" title="Settings"></app-page-header>
        <a class="setting-card rd-card" routerLink="/settings/homams">
          <span class="setting-icon"><ion-icon name="flame-outline" aria-hidden="true"></ion-icon></span>
          <span>
            <strong>Homam catalog</strong>
            <small>Manage homam names, pricing and required items</small>
          </span>
          <span class="chevron" aria-hidden="true">›</span>
        </a>
        <a class="setting-card rd-card" routerLink="/settings/reminders">
          <span class="setting-icon"><ion-icon name="alarm-outline" aria-hidden="true"></ion-icon></span>
          <span>
            <strong>Reminders</strong>
            <small>Manage upcoming tasks and booking reminders</small>
          </span>
          <span class="chevron" aria-hidden="true">›</span>
        </a>
        <a class="setting-card rd-card" routerLink="/settings/rituals">
          <span class="setting-icon"><ion-icon name="flame-outline" aria-hidden="true"></ion-icon></span>
          <span>
            <strong>Rituals</strong>
            <small>Manage daily, weekly, monthly and special rituals</small>
          </span>
          <span class="chevron" aria-hidden="true">›</span>
        </a>
      </main>
    </ion-content>
  `,
  styles: [`
    .setting-card { display:flex; min-height:72px; align-items:center; gap:14px; padding:14px; color:var(--rd-ink); text-decoration:none; }
    .setting-icon { display:grid; width:48px; height:48px; flex:0 0 48px; place-items:center; border-radius:15px; background:var(--rd-completed); color:var(--rd-maroon); }
    ion-icon { font-size:23px; }
    strong,small { display:block; }
    small { margin-top:4px; color:var(--rd-muted); }
    .chevron { margin-left:auto; color:var(--rd-muted); font-size:28px; }
  `],
  imports: [IonContent, IonIcon, PageHeaderComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  constructor() {
    addIcons({ alarmOutline, flameOutline });
  }
}
