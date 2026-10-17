import { inject, Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import { firstValueFrom } from 'rxjs';
import { Reminder } from '../models';
import { ReminderService } from './reminder.service';

@Injectable({ providedIn: 'root' })
export class ReminderNotificationService {
  private readonly reminders = inject(ReminderService);
  private readonly permissionAskedKey = 'ritualdesk.notificationsPermissionAsked';

  async sync(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const reminders = await firstValueFrom(this.reminders.list());
    const future = reminders
      .filter((reminder) => {
        const time = this.reminderDate(reminder).getTime();
        return !this.isDone(reminder) && !Number.isNaN(time) && time > Date.now();
      });
    const futureIds = new Set(future.map((reminder) => reminder.id));
    const pending = await LocalNotifications.getPending();
    const permission = await LocalNotifications.checkPermissions();
    let displayPermission = permission.display;
    if (displayPermission !== 'granted') {
      const { value } = await Preferences.get({ key: this.permissionAskedKey });
      if (value !== 'true') {
        await Preferences.set({ key: this.permissionAskedKey, value: 'true' });
        displayPermission = (await LocalNotifications.requestPermissions()).display;
      }
    }
    if (displayPermission !== 'granted') {
      if (pending.notifications.length) {
        await LocalNotifications.cancel({
          notifications: pending.notifications.map(({ id }) => ({ id })),
        });
      }
      return;
    }

    if (pending.notifications.length) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map(({ id }) => ({ id })),
      });
    }

    const toSchedule = future.map((reminder) => ({
      id: reminder.id,
      title: reminder.title,
      body: 'RitualDesk reminder',
      schedule: { at: this.reminderDate(reminder) },
    }));
    if (toSchedule.length) {
      await LocalNotifications.schedule({ notifications: toSchedule });
    }
  }

  private isDone(reminder: Reminder): boolean {
    return reminder.done === true || reminder.done === 1;
  }

  private reminderDate(reminder: Reminder): Date {
    return new Date(reminder.remindAt.replace(' ', 'T'));
  }
}
