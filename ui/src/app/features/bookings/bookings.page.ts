import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonSkeletonText, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { BookingStatus, BookingSummary } from '../../core/models';
import { BookingService } from '../../core/services/booking.service';
import { BookingDataRefreshService } from '../../core/services/booking-data-refresh.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { BookingCardComponent } from '../../shared/components/booking-card/booking-card.component';

interface BookingFilter {
  label: string;
  status?: BookingStatus;
}

@Component({
  selector: 'app-bookings-page',
  standalone: true,
  template: `
    <ion-content class="rd-page-content">
      <main class="rd-page-padding">
        <app-page-header
          eyebrow="RitualDesk"
          title="Bookings"
          actionLabel="+ New booking"
          (action)="newBooking()"
        ></app-page-header>
        @if (isLoading() && !allBookings().length) {
          <section class="stats-grid" aria-label="Loading booking totals">
            @for (item of statSkeletons; track item) {
              <article class="stat-skeleton rd-card">
                <ion-skeleton-text animated></ion-skeleton-text>
                <ion-skeleton-text animated></ion-skeleton-text>
              </article>
            }
          </section>
        } @else {
          <section class="stats-grid" aria-label="Booking totals">
            <app-stat-card label="Total" [value]="allBookings().length"></app-stat-card>
            <app-stat-card
              label="Balance due"
              [value]="(totalBalanceDue() | currency:'INR':'symbol':'1.0-0':'en-IN') ?? ''"
            ></app-stat-card>
            <app-stat-card label="Scheduled" [value]="scheduledCount()"></app-stat-card>
          </section>
        }

        <nav class="filters" aria-label="Filter bookings">
          @for (filter of filters; track filter.label) {
            <button
              type="button"
              [class.active]="selectedFilter() === filter.label"
              [attr.aria-pressed]="selectedFilter() === filter.label"
              (click)="selectFilter(filter)"
            >{{ filter.label }}</button>
          }
        </nav>

        @if (isLoading()) {
          <section class="booking-list" aria-label="Loading bookings">
            @for (row of listSkeletons; track row) {
              <article class="booking-skeleton rd-card">
                <ion-skeleton-text animated></ion-skeleton-text>
                <ion-skeleton-text animated></ion-skeleton-text>
                <ion-skeleton-text animated></ion-skeleton-text>
              </article>
            }
          </section>
        } @else if (loadFailed()) {
          <app-empty-state title="Bookings unavailable" message="Bookings could not be loaded. Please try again."></app-empty-state>
        } @else if (bookings().length) {
          <section class="booking-list" aria-label="Bookings">
            @for (booking of bookings(); track booking.id) {
              <app-booking-card [booking]="booking" (selected)="openBooking($event)"></app-booking-card>
            }
          </section>
        } @else {
          <app-empty-state
            [title]="selectedFilter() === 'All' ? 'No bookings yet' : 'No ' + selectedFilter().toLowerCase() + ' bookings'"
            message="Bookings matching this filter will appear here."
          ></app-empty-state>
        }
      </main>
    </ion-content>
  `,
  styles: [`
    .stats-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; margin-bottom:18px; }
    .stat-skeleton { display:grid; min-width:0; min-height:108px; align-content:center; gap:10px; padding:12px; }
    ion-skeleton-text:first-child { width:55%; height:14px; }
    ion-skeleton-text:last-child { width:75%; height:24px; }
    .filters { display:flex; gap:8px; overflow-x:auto; margin:0 -16px 16px; padding:4px 16px 10px; scrollbar-width:thin; }
    .filters button { min-height:48px; flex:0 0 auto; padding:0 15px; border:1px solid var(--rd-border); border-radius:999px; background:transparent; color:var(--rd-ink); font:inherit; }
    .filters button.active { border-color:var(--rd-maroon); background:var(--rd-maroon); color:var(--rd-cream); }
    .booking-list { display:grid; gap:12px; }
    .booking-skeleton { display:grid; min-height:120px; align-content:center; gap:12px; padding:16px; }
    .booking-skeleton ion-skeleton-text { height:16px; }
    .booking-skeleton ion-skeleton-text:first-child { width:60%; }
    .booking-skeleton ion-skeleton-text:nth-child(2) { width:85%; }
    .booking-skeleton ion-skeleton-text:last-child { width:70%; }
    @media (min-width:720px) { .stats-grid { grid-template-columns:repeat(3,minmax(0,1fr)); } }
  `],
  imports: [
    BookingCardComponent,
    CurrencyPipe,
    EmptyStateComponent,
    IonContent,
    IonSkeletonText,
    PageHeaderComponent,
    StatCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingsPage {
  private readonly bookingService = inject(BookingService);
  private readonly bookingDataRefresh = inject(BookingDataRefreshService);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);
  private requestId = 0;

  readonly filters: BookingFilter[] = [
    { label: 'All' },
    { label: 'Booked', status: 'booked' },
    { label: 'Scheduled', status: 'scheduled' },
    { label: 'Completed', status: 'completed' },
    { label: 'Cancelled', status: 'cancelled' },
  ];
  readonly selectedFilter = signal('All');
  readonly allBookings = signal<BookingSummary[]>([]);
  readonly bookings = signal<BookingSummary[]>([]);
  readonly isLoading = signal(true);
  readonly loadFailed = signal(false);
  readonly listSkeletons = [0, 1, 2];
  readonly statSkeletons = [0, 1, 2];
  private readonly refreshEffect = effect(() => {
    this.bookingDataRefresh.revision();
    void this.loadAll();
  });

  readonly totalBalanceDue = () => this.allBookings()
    .filter((booking) => booking.status !== 'cancelled')
    .reduce((total, booking) => total + Math.max(0, booking.balance), 0);
  readonly scheduledCount = () => this.allBookings()
    .filter((booking) => booking.status === 'scheduled').length;

  newBooking(): void {
    void this.router.navigateByUrl('/bookings/new');
  }

  openBooking(id: number): void {
    void this.router.navigate(['/bookings', id]);
  }

  async selectFilter(filter: BookingFilter): Promise<void> {
    this.selectedFilter.set(filter.label);
    this.isLoading.set(true);
    this.loadFailed.set(false);
    const currentRequest = ++this.requestId;
    try {
      const result = await firstValueFrom(this.bookingService.list(
        filter.status ? { status: filter.status } : {},
      ));
      if (currentRequest === this.requestId) {
        this.bookings.set(this.sortBookings(result));
      }
    } catch (error) {
      if (currentRequest === this.requestId) {
        this.loadFailed.set(true);
        await this.showError(error);
      }
    } finally {
      if (currentRequest === this.requestId) {
        this.isLoading.set(false);
      }
    }
  }

  private async loadAll(): Promise<void> {
    const currentRequest = ++this.requestId;
    this.isLoading.set(true);
    this.loadFailed.set(false);
    try {
      const filter = this.filters.find((item) => item.label === this.selectedFilter());
      const allRequest = this.bookingService.list();
      const visibleRequest = filter?.status
        ? this.bookingService.list({ status: filter.status })
        : allRequest;
      const [allBookings, visibleBookings] = await Promise.all([
        firstValueFrom(allRequest),
        firstValueFrom(visibleRequest),
      ]);
      if (currentRequest === this.requestId) {
        this.allBookings.set(this.sortBookings(allBookings));
        this.bookings.set(this.sortBookings(visibleBookings));
      }
    } catch (error) {
      if (currentRequest === this.requestId) {
        this.loadFailed.set(true);
        await this.showError(error);
      }
    } finally {
      if (currentRequest === this.requestId) {
        this.isLoading.set(false);
      }
    }
  }

  private sortBookings(bookings: BookingSummary[]): BookingSummary[] {
    return [...bookings].sort((left, right) => {
      if (left.scheduledAt === null) return right.scheduledAt === null ? left.id - right.id : 1;
      if (right.scheduledAt === null) return -1;
      return left.scheduledAt.localeCompare(right.scheduledAt) || left.id - right.id;
    });
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
