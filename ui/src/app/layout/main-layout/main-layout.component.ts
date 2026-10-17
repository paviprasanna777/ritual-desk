import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonTabBar,
  IonTabButton,
  IonTabs,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import {
  calendarNumberOutline,
  calendarOutline,
  homeOutline,
  peopleOutline,
  timeOutline,
  settingsOutline,
  flameOutline,
  alarmOutline,
  logOutOutline,
} from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { MenuController } from '@ionic/angular';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
  imports: [
    IonIcon,
    IonContent,
    IonItem,
    IonLabel,
    IonList,
    IonMenu,
    IonTabBar,
    IonTabButton,
    IonTabs,
    RouterLink,
    RouterLinkActive,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly menuController = inject(MenuController);
  private readonly toastController = inject(ToastController);

  constructor() {
    addIcons({
      homeOutline,
      calendarNumberOutline,
      calendarOutline,
      peopleOutline,
      timeOutline,
      settingsOutline,
      flameOutline,
      alarmOutline,
      logOutOutline,
    });
  }

  async logout(): Promise<void> {
    try {
      await this.auth.logout();
      await this.menuController.close('main-menu');
      await this.router.navigateByUrl('/login');
    } catch (error) {
      const toast = await this.toastController.create({
        message: error instanceof Error ? error.message : 'Could not log out.',
        duration: 3500,
        position: 'top',
        color: 'danger',
      });
      await toast.present();
    }
  }
}
