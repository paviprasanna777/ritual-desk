import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonCheckbox, IonContent, IonSkeletonText, MenuController, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { DashboardSummary, ScheduleItem } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { BookingDataRefreshService } from '../../core/services/booking-data-refresh.service';
import { ReminderNotificationService } from '../../core/services/reminder-notification.service';
import { RitualService } from '../../core/services/ritual.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { BookingCardComponent } from '../../shared/components/booking-card/booking-card.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  template: `
    <ion-content class="rd-page-content">
      <main class="rd-page-padding">
        <app-page-header
          eyebrow="RitualDesk · {{ today | date:'fullDate' }}"
          [title]="'Namaste, ' + (auth.displayName() || 'there')"
          [showBack]="false"
          actionLabel="Menu"
          actionIcon="menu-outline"
          (action)="openMenu()"
        ></app-page-header>

        @if (isLoading()) {
          <section class="stats-grid" aria-label="Loading dashboard summary">
            @for (item of statSkeletons; track item) {
              <article class="stat-skeleton rd-card">
                <ion-skeleton-text animated></ion-skeleton-text>
                <ion-skeleton-text animated></ion-skeleton-text>
              </article>
            }
          </section>
          @for (section of loadingSections; track section) {
            <section class="dashboard-section" [attr.aria-label]="'Loading ' + section">
              <ion-skeleton-text animated class="heading-skeleton"></ion-skeleton-text>
              @for (row of listSkeletons; track row) {
                <article class="list-skeleton rd-card">
                  <ion-skeleton-text animated></ion-skeleton-text>
                  <ion-skeleton-text animated></ion-skeleton-text>
                </article>
              }
            </section>
          }
        } @else if (summary(); as dashboard) {
          <section class="stats-grid" aria-label="Dashboard summary">
            <app-stat-card label="Today" [value]="dashboard.todayCount" detail="bookings and rituals"></app-stat-card>
            <app-stat-card
              label="Balance to collect"
              [value]="(dashboard.balanceToCollect | currency:'INR':'symbol':'1.0-0':'en-IN') ?? ''"
            ></app-stat-card>
            <app-stat-card label="Next 7 days" [value]="dashboard.next7DaysCount" detail="scheduled bookings"></app-stat-card>
          </section>

          <section class="dashboard-section">
            <h2>Today</h2>
            @if (dashboard.todaysItems.length) {
              <div class="today-list">
                @for (item of todayItems(); track item.type + ':' + item.id) {
                  <article class="today-row rd-card">
                    <span class="time">{{ item.time }}</span>
                    @if (item.type === 'ritual') {
                      <ion-checkbox
                        [checked]="item.done"
                        [aria-label]="'Mark ' + item.title + (item.done ? ' incomplete' : ' complete')"
                        (ionChange)="toggleRitual(item, $event.detail.checked)"
                      ></ion-checkbox>
                    }
                    <button type="button" class="item-title" (click)="openTodayItem(item)">
                      <strong>{{ item.title }}</strong>
                      <small>{{ item.type === 'booking' ? item.status : (item.done ? 'Completed ritual' : 'Ritual') }}</small>
                    </button>
                  </article>
                }
              </div>
            } @else {
              <app-empty-state title="Nothing scheduled today" message="Bookings and rituals for today will appear here."></app-empty-state>
            }
          </section>

          <section class="dashboard-section">
            <h2>Upcoming</h2>
            @if (dashboard.upcoming.length) {
              <div class="card-list">
                @for (booking of dashboard.upcoming; track booking.id) {
                  <app-booking-card [booking]="booking" (selected)="openBooking($event)"></app-booking-card>
                }
              </div>
            } @else {
              <app-empty-state title="No upcoming bookings" message="Your next bookings will appear here."></app-empty-state>
            }
          </section>

          <section class="dashboard-section">
            <h2>Balance due</h2>
            @if (dashboard.balanceDue.length) {
              <div class="card-list">
                @for (booking of dashboard.balanceDue; track booking.id) {
                  <app-booking-card [booking]="booking" (selected)="openBooking($event)"></app-booking-card>
                }
              </div>
            } @else {
              <app-empty-state title="No balance due" message="Bookings with an outstanding balance will appear here."></app-empty-state>
            }
          </section>

          <section class="dashboard-section">
            <h2>Reminders</h2>
            @if (dashboard.todaysReminders.length) {
              <div class="card-list">
                @for (reminder of dashboard.todaysReminders; track reminder.id) {
                  <button class="reminder-row rd-card" type="button" (click)="openReminders()">
                    <span class="time">{{ reminder.remindAt | date:'shortTime' }}</span>
                    <span><strong>{{ reminder.title }}</strong><small>{{ reminder.done ? 'Done' : 'Today' }}</small></span>
                  </button>
                }
              </div>
            } @else {
              <app-empty-state title="No reminders today" message="Today's reminders will appear here."></app-empty-state>
            }
          </section>
        } @else {
          <app-empty-state title="Dashboard unavailable" message="The dashboard summary is not available right now."></app-empty-state>
        }
      </main>
    </ion-content>
  `,
  styles: [`
    .stats-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin-bottom:20px; }
    .stat-skeleton { display:grid; min-height:108px; align-content:center; gap:12px; padding:14px; }
    ion-skeleton-text:first-child { width:55%; height:14px; }
    ion-skeleton-text:last-child { width:75%; height:24px; }
    .dashboard-section { display:grid; gap:12px; margin:24px 0; }
    .heading-skeleton { width:35%; height:24px; }
    .list-skeleton { display:grid; min-height:70px; align-content:center; gap:10px; padding:14px; }
    .list-skeleton ion-skeleton-text:first-child { width:55%; height:16px; }
    .list-skeleton ion-skeleton-text:last-child { width:75%; height:13px; }
    h2 { margin:0; color:var(--rd-ink); font:500 22px Fraunces,Georgia,serif; }
    .today-list,.card-list { display:grid; gap:10px; }
    .today-row,.reminder-row { display:flex; min-height:var(--rd-tap-target); align-items:center; gap:12px; padding:12px; }
    .reminder-row { width:100%; border:0; color:var(--rd-ink); text-align:left; font:inherit; }
    .time { width:62px; flex:0 0 62px; color:var(--rd-maroon); font-weight:700; }
    .item-title { display:flex; min-width:0; min-height:var(--rd-tap-target); flex:1; flex-direction:column; justify-content:center; gap:3px; border:0; background:transparent; color:var(--rd-ink); text-align:left; font:inherit; }
    .item-title small,.reminder-row small { color:var(--rd-muted); font-size:12px; text-transform:capitalize; }
    @media (min-width:720px) { .stats-grid { grid-template-columns:repeat(3,minmax(0,1fr)); } }
  `],
  imports: [
    BookingCardComponent,
    CurrencyPipe,
    DatePipe,
    EmptyStateComponent,
    IonCheckbox,
    IonContent,
    IonSkeletonText,
    PageHeaderComponent,
    StatCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly dashboardService = inject(DashboardService);
  private readonly bookingDataRefresh = inject(BookingDataRefreshService);
  private readonly notificationService = inject(ReminderNotificationService);
  private readonly ritualService = inject(RitualService);
  private readonly router = inject(Router);
  private readonly menuController = inject(MenuController);
  private readonly toastController = inject(ToastController);
  protected readonly auth = inject(AuthService);
  private requestId = 0;

  readonly isLoading = signal(true);
  readonly summary = signal<DashboardSummary | null>(null);
  private readonly refreshEffect = effect(() => {
    this.bookingDataRefresh.revision();
    void this.loadSummary();
  });
  readonly today = new Date();
  readonly statSkeletons = [0, 1, 2];
  readonly listSkeletons = [0, 1, 2];
  readonly loadingSections = ['Today', 'Upcoming', 'Balance due', 'Reminders'];

  todayItems(): ScheduleItem[] {
    return [...(this.summary()?.todaysItems ?? [])].sort((left, right) =>
      left.time.localeCompare(right.time),
    );
  }

  async toggleRitual(item: Extract<ScheduleItem, { type: 'ritual' }>, done: boolean): Promise<void> {
    try {
      const year = this.today.getFullYear();
      const month = String(this.today.getMonth() + 1).padStart(2, '0');
      const day = String(this.today.getDate()).padStart(2, '0');
      const date = `${year}-${month}-${day}`;
      if (done) {
        await firstValueFrom(this.ritualService.log(item.id, date));
      } else {
        await firstValueFrom(this.ritualService.removeLog(item.id, date));
      }
      await this.loadSummary();
    } catch (error) {
      await this.showError(error);
    }
  }

  openTodayItem(item: ScheduleItem): void {
    if (item.type === 'booking') {
      this.openBooking(item.id);
      return;
    }
    void this.router.navigateByUrl('/schedule');
  }

  openBooking(id: number): void {
    void this.router.navigate(['/bookings', id]);
  }

  openReminders(): void {
    void this.router.navigateByUrl('/settings/reminders');
  }

  async openMenu(): Promise<void> {
    await this.menuController.open('main-menu');
  }

  private async loadSummary(): Promise<void> {
    const requestId = ++this.requestId;
    this.isLoading.set(true);
    try {
      const summary = await firstValueFrom(this.dashboardService.getSummary());
      if (requestId === this.requestId) {
        this.summary.set(summary);
        await this.notificationService.sync();
      }
    } catch (error) {
      if (requestId === this.requestId) {
        await this.showError(error);
      }
    } finally {
      if (requestId === this.requestId) {
        this.isLoading.set(false);
      }
    }
  }

  private async showError(error: unknown): Promise<void> {
    const toast = await this.toastController.create({
      message: error instanceof Error ? error.message : 'The request could not be completed.',
      duration: 3500,
      position: 'top',
      color: 'danger',
    });
    await toast.present();
  }
}
