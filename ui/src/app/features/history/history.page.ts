import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { IonContent, IonSkeletonText, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { BookingSummary, HistorySummary } from '../../core/models';
import { HistoryService } from '../../core/services/history.service';
import { BookingCardComponent } from '../../shared/components/booking-card/booking-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';

@Component({
  selector: 'app-history-page',
  standalone: true,
  template: `
    <ion-content class="rd-page-content">
      <main class="rd-page-padding">
        <app-page-header eyebrow="RitualDesk" title="History"></app-page-header>

        <nav class="month-picker" aria-label="Choose history month">
          <button type="button" aria-label="Previous month" (click)="changeMonth(-1)">‹</button>
          <h2>{{ monthDate() | date:'MMMM y' }}</h2>
          <button type="button" aria-label="Next month" (click)="changeMonth(1)">›</button>
        </nav>

        @if (isLoading()) {
          <section class="stats-grid" aria-label="Loading monthly totals">
            @for (item of skeletonStats; track item) {
              <article class="stat-skeleton rd-card">
                <ion-skeleton-text animated></ion-skeleton-text>
                <ion-skeleton-text animated></ion-skeleton-text>
              </article>
            }
          </section>
        } @else if (history(); as result) {
          <section class="stats-grid" aria-label="Monthly history totals">
            <app-stat-card label="Bookings" [value]="result.items.length"></app-stat-card>
            <app-stat-card
              label="Charged"
              [value]="(result.totals.totalCharged | currency:'INR':'symbol':'1.0-0':'en-IN') ?? ''"
            ></app-stat-card>
            <app-stat-card
              label="Collected"
              [value]="(result.totals.totalCollected | currency:'INR':'symbol':'1.0-0':'en-IN') ?? ''"
            ></app-stat-card>
          </section>
        }

        @if (isLoading()) {
          <section class="history-list" aria-label="Loading booking history">
            @for (row of skeletonRows; track row) {
              <article class="history-skeleton rd-card">
                <ion-skeleton-text animated></ion-skeleton-text>
                <ion-skeleton-text animated></ion-skeleton-text>
                <ion-skeleton-text animated></ion-skeleton-text>
              </article>
            }
          </section>
        } @else if (loadFailed()) {
          <app-empty-state title="History unavailable" message="Booking history could not be loaded. Please try again."></app-empty-state>
        } @else if (history()?.items?.length) {
          <section class="history-list" aria-label="Completed and cancelled bookings">
            @for (booking of newestFirst(); track booking.id) {
              <app-booking-card [booking]="booking" [interactive]="false"></app-booking-card>
            }
          </section>
        } @else {
          <app-empty-state title="No history this month" message="Completed and cancelled bookings will appear here."></app-empty-state>
        }
      </main>
    </ion-content>
  `,
  styles: [`
    .month-picker { display:flex; align-items:center; justify-content:space-between; gap:12px; margin:0 0 18px; }
    .month-picker h2 { margin:0; color:var(--rd-ink); font:500 20px Fraunces,Georgia,serif; text-align:center; }
    .month-picker button { width:48px; height:48px; flex:0 0 48px; border:1px solid var(--rd-border); border-radius:14px; background:transparent; color:var(--rd-maroon); font-size:30px; line-height:1; }
    .stats-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; margin-bottom:20px; }
    .stat-skeleton { display:grid; min-width:0; min-height:108px; align-content:center; gap:10px; padding:12px; }
    .stat-skeleton ion-skeleton-text:first-child { width:55%; height:14px; }
    .stat-skeleton ion-skeleton-text:last-child { width:75%; height:24px; }
    .history-list { display:grid; gap:12px; }
    .history-skeleton { display:grid; min-height:120px; align-content:center; gap:12px; padding:16px; }
    .history-skeleton ion-skeleton-text { height:16px; }
    .history-skeleton ion-skeleton-text:first-child { width:60%; }
    .history-skeleton ion-skeleton-text:nth-child(2) { width:85%; }
    .history-skeleton ion-skeleton-text:last-child { width:70%; }
  `],
  imports: [
    BookingCardComponent,
    CurrencyPipe,
    DatePipe,
    EmptyStateComponent,
    IonContent,
    IonSkeletonText,
    PageHeaderComponent,
    StatCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryPage implements OnInit {
  private readonly historyService = inject(HistoryService);
  private readonly toastController = inject(ToastController);
  private requestId = 0;

  readonly month = signal(this.monthKey(new Date()));
  readonly history = signal<HistorySummary | null>(null);
  readonly isLoading = signal(true);
  readonly loadFailed = signal(false);
  readonly skeletonStats = [0, 1, 2];
  readonly skeletonRows = [0, 1, 2];

  ngOnInit(): void {
    void this.loadMonth();
  }

  monthDate(): Date {
    return new Date(`${this.month()}-01T00:00:00`);
  }

  newestFirst(): BookingSummary[] {
    return [...(this.history()?.items ?? [])].sort((left, right) => {
      const leftDate = left.completedAt ?? left.cancelledAt ?? '';
      const rightDate = right.completedAt ?? right.cancelledAt ?? '';
      return rightDate.localeCompare(leftDate) || right.id - left.id;
    });
  }

  changeMonth(offset: number): void {
    const date = this.monthDate();
    date.setMonth(date.getMonth() + offset);
    this.month.set(this.monthKey(date));
    void this.loadMonth();
  }

  private monthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private async loadMonth(): Promise<void> {
    const requestId = ++this.requestId;
    this.isLoading.set(true);
    this.loadFailed.set(false);
    this.history.set(null);
    try {
      const result = await firstValueFrom(this.historyService.list(this.month()));
      if (requestId === this.requestId) {
        this.history.set(result);
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
