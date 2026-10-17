import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonSkeletonText, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { ScheduleItem, ScheduleRitualItem } from '../../core/models';
import { RitualService } from '../../core/services/ritual.service';
import { ScheduleService } from '../../core/services/schedule.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { buildMonthCalendar, CalendarCell } from './month-calendar';

const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function localDate(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

@Component({
  selector: 'app-schedule-page',
  standalone: true,
  template: `
    <ion-content class="rd-page-content">
      <main class="rd-page-padding">
        <app-page-header eyebrow="RitualDesk" title="Schedule"></app-page-header>
        <section class="calendar-card rd-card" aria-label="Monthly calendar">
          <header class="month-header">
            <button type="button" aria-label="Previous month" (click)="changeMonth(-1)">‹</button>
            <h2>{{ monthLabel() }}</h2>
            <button type="button" aria-label="Next month" (click)="changeMonth(1)">›</button>
          </header>
          <div class="calendar-grid weekday-row" aria-hidden="true">
            @for (weekday of weekdays; track weekday) {
              <span>{{ weekday }}</span>
            }
          </div>
          @if (isLoading()) {
            <div class="calendar-grid calendar-skeleton" aria-label="Loading schedule">
              @for (cell of calendarCells(); track $index) {
                <ion-skeleton-text animated></ion-skeleton-text>
              }
            </div>
          } @else {
            <div class="calendar-grid">
              @for (cell of calendarCells(); track $index) {
                @if (cell.date) {
                  <button
                    type="button"
                    class="day-cell"
                    [class.today]="cell.date === today"
                    [class.selected]="cell.date === selectedDate()"
                    [attr.aria-label]="dayLabel(cell)"
                    [attr.aria-pressed]="cell.date === selectedDate()"
                    (click)="selectDay(cell.date)"
                  >
                    <span>{{ cell.day }}</span>
                    @if (hasItems(cell.date)) {
                      <span class="item-dot" aria-label="Has schedule items"></span>
                    }
                  </button>
                } @else {
                  <span class="empty-cell" aria-hidden="true"></span>
                }
              }
            </div>
          }
        </section>

        @if (loadFailed()) {
          <app-empty-state title="Schedule unavailable" message="The schedule could not be loaded for this month."></app-empty-state>
        } @else {
          <section class="day-section">
            <h2>{{ selectedDate() | date:'EEEE, d MMMM y' }}</h2>
            @if (isLoading()) {
              <div class="items-skeleton" aria-label="Loading selected day">
                @for (row of skeletonRows; track row) {
                  <article class="item-skeleton rd-card">
                    <ion-skeleton-text animated></ion-skeleton-text>
                    <ion-skeleton-text animated></ion-skeleton-text>
                  </article>
                }
              </div>
            } @else if (selectedItems().length) {
              <div class="schedule-list">
                @for (item of selectedItems(); track item.type + item.id) {
                  @if (item.type === 'booking') {
                    <button class="schedule-item rd-card" type="button" (click)="openBooking(item.id)">
                      <span class="item-details">
                        <strong>{{ item.title }}</strong>
                        <span>{{ item.time | date:'shortTime' }}</span>
                      </span>
                      <app-status-chip [status]="item.status"></app-status-chip>
                    </button>
                  } @else {
                    <label class="schedule-item ritual-item rd-card">
                      <span class="item-details">
                        <strong>{{ item.title }}</strong>
                        <span>{{ item.time | date:'shortTime' }}</span>
                      </span>
                      <input
                        type="checkbox"
                        [checked]="item.done"
                        [disabled]="isToggling(item)"
                        [attr.aria-label]="(item.done ? 'Mark incomplete: ' : 'Complete: ') + item.title"
                        (change)="toggleRitual(item, $event)"
                      >
                    </label>
                  }
                }
              </div>
            } @else {
              <app-empty-state title="Nothing scheduled" message="There are no bookings or rituals for this day."></app-empty-state>
            }
          </section>
        }
      </main>
    </ion-content>
  `,
  styles: [`
    .calendar-card { padding:12px; }
    .month-header { display:grid; grid-template-columns:48px 1fr 48px; align-items:center; margin-bottom:8px; text-align:center; }
    .month-header h2 { margin:0; color:var(--rd-ink); font:500 20px Fraunces, Georgia, serif; }
    .month-header button { width:48px; height:48px; border:0; border-radius:50%; background:transparent; color:var(--rd-maroon); font-size:30px; line-height:1; }
    .calendar-grid { display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); }
    .weekday-row span { display:grid; min-height:36px; place-items:center; color:var(--rd-muted); font-size:12px; font-weight:700; }
    .day-cell { position:relative; display:grid; min-width:0; min-height:48px; place-items:center; border:2px solid transparent; border-radius:50%; background:transparent; color:var(--rd-ink); font:inherit; }
    .day-cell.today { background:var(--rd-maroon); color:var(--rd-cream); }
    .day-cell.selected { border-color:var(--rd-ink); }
    .day-cell.today.selected { border-color:var(--rd-saffron); }
    .item-dot { position:absolute; bottom:3px; width:6px; height:6px; border-radius:50%; background:var(--rd-saffron); }
    .day-cell.today .item-dot { background:var(--rd-saffron); box-shadow:0 0 0 1px var(--rd-maroon); }
    .empty-cell { min-height:48px; }
    .calendar-skeleton ion-skeleton-text { width:34px; height:34px; margin:auto; border-radius:50%; }
    .day-section { margin-top:22px; }
    .day-section > h2 { margin:0 0 12px; color:var(--rd-ink); font:500 20px Fraunces, Georgia, serif; }
    .schedule-list,.items-skeleton { display:grid; gap:10px; }
    .schedule-item { display:flex; width:100%; min-height:64px; align-items:center; justify-content:space-between; gap:12px; padding:12px 14px; color:var(--rd-ink); text-align:left; font:inherit; }
    .item-details { display:grid; gap:4px; }
    .item-details span { color:var(--rd-muted); font-size:13px; }
    .ritual-item input { width:24px; height:24px; accent-color:var(--rd-maroon); }
    .item-skeleton { display:grid; min-height:64px; align-content:center; gap:8px; padding:14px; }
    .item-skeleton ion-skeleton-text:first-child { width:55%; height:16px; }
    .item-skeleton ion-skeleton-text:last-child { width:30%; height:14px; }
  `],
  imports: [
    DatePipe,
    EmptyStateComponent,
    IonContent,
    IonSkeletonText,
    PageHeaderComponent,
    StatusChipComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchedulePage implements OnInit {
  private readonly scheduleService = inject(ScheduleService);
  private readonly ritualService = inject(RitualService);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);
  private readonly month = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  private readonly items = signal<ScheduleItem[]>([]);
  private readonly toggling = signal<Set<string>>(new Set());
  private requestId = 0;

  readonly weekdays = weekdayNames;
  readonly selectedDate = signal(this.currentDate());
  readonly isLoading = signal(true);
  readonly loadFailed = signal(false);
  readonly skeletonRows = [0, 1];
  readonly today = this.currentDate();
  readonly calendarCells = () => buildMonthCalendar(
    this.month().getFullYear(),
    this.month().getMonth(),
  );
  readonly monthLabel = () => new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
  }).format(this.month());
  readonly selectedItems = () => this.itemsFor(this.selectedDate());

  ngOnInit(): void {
    this.selectedDate.set(this.today);
    void this.loadMonth();
  }

  changeMonth(offset: number): void {
    const current = this.month();
    const next = new Date(current.getFullYear(), current.getMonth() + offset, 1);
    this.month.set(next);
    this.selectedDate.set(localDate(next.getFullYear(), next.getMonth(), 1));
    void this.loadMonth();
  }

  selectDay(date: string): void {
    this.selectedDate.set(date);
  }

  hasItems(date: string): boolean {
    return this.items().some((item) => this.itemDate(item) === date);
  }

  dayLabel(cell: CalendarCell): string {
    if (!cell.date) return '';
    const date = new Date(`${cell.date}T12:00:00`);
    const count = this.itemsFor(cell.date).length;
    return `${new Intl.DateTimeFormat('en', { dateStyle: 'full' }).format(date)}${count ? `, ${count} ${count === 1 ? 'item' : 'items'}` : ''}`;
  }

  openBooking(id: number): void {
    void this.router.navigate(['/bookings', id]);
  }

  isToggling(item: ScheduleRitualItem): boolean {
    return this.toggling().has(this.ritualKey(item));
  }

  async toggleRitual(item: ScheduleRitualItem, event: Event): Promise<void> {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const wasDone = item.done;
    const date = this.itemDate(item);
    if (!date) return;
    this.setToggling(item, true);
    try {
      if (wasDone) {
        await firstValueFrom(this.ritualService.removeLog(item.id, date));
      } else {
        await firstValueFrom(this.ritualService.log(item.id, date));
      }
      this.items.update((items) => items.map((entry) => (
        entry.type === 'ritual' && entry.id === item.id && entry.time.slice(0, 10) === date
          ? { ...entry, done: !wasDone, status: wasDone ? 'pending' : 'done' }
          : entry
      )));
    } catch (error) {
      input.checked = wasDone;
      await this.showError(error);
    } finally {
      this.setToggling(item, false);
    }
  }

  private currentDate(): string {
    const now = new Date();
    return localDate(now.getFullYear(), now.getMonth(), now.getDate());
  }

  private itemsFor(date: string): ScheduleItem[] {
    return this.items().filter((item) => this.itemDate(item) === date)
      .sort((left, right) => left.time.localeCompare(right.time)
        || left.type.localeCompare(right.type)
        || left.id - right.id);
  }

  private itemDate(item: ScheduleItem): string {
    return item.time.slice(0, 10);
  }

  private ritualKey(item: ScheduleRitualItem): string {
    return `${item.id}:${this.itemDate(item)}`;
  }

  private setToggling(item: ScheduleRitualItem, value: boolean): void {
    this.toggling.update((keys) => {
      const next = new Set(keys);
      if (value) next.add(this.ritualKey(item));
      else next.delete(this.ritualKey(item));
      return next;
    });
  }

  private async loadMonth(): Promise<void> {
    this.isLoading.set(true);
    this.loadFailed.set(false);
    const requestId = ++this.requestId;
    const current = this.month();
    const from = localDate(current.getFullYear(), current.getMonth(), 1);
    const lastDay = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
    const to = localDate(current.getFullYear(), current.getMonth(), lastDay);
    try {
      const items = await firstValueFrom(this.scheduleService.list(from, to));
      if (requestId === this.requestId) {
        this.items.set(items);
      }
    } catch (error) {
      if (requestId === this.requestId) {
        this.loadFailed.set(true);
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
