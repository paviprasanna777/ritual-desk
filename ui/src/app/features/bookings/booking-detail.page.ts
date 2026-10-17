import { CurrencyPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonContent, IonSkeletonText, ModalController, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { Booking, BookingCompleteInput, BookingCompleteResult } from '../../core/models';
import { BookingService } from '../../core/services/booking.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import {
  BookingActionModalComponent,
  BookingActionMode,
  BookingActionResult,
} from './booking-action-modal.component';

@Component({
  selector: 'app-booking-detail-page',
  standalone: true,
  template: `
    <ion-content class="rd-page-content">
      <main class="rd-page-padding">
        <app-page-header
          eyebrow="Bookings"
          [title]="booking()?.homamName ?? 'Booking details'"
          [actionLabel]="isOpen() ? 'Edit' : ''"
          (action)="edit()"
        ></app-page-header>
        @if (isLoading()) {
          <article class="detail-skeleton rd-card" aria-label="Loading booking">
            @for (row of skeletonRows; track row) {
              <ion-skeleton-text animated></ion-skeleton-text>
            }
          </article>
        } @else if (loadFailed()) {
          <app-empty-state title="Booking unavailable" message="This booking could not be loaded."></app-empty-state>
        } @else if (booking(); as item) {
          <section class="summary-card rd-card">
            <div class="summary-heading">
              <div>
                <h2>{{ item.homamName }}</h2>
                <a [routerLink]="['/devotees', item.devoteeId]">{{ item.devoteeName }}</a>
              </div>
              <app-status-chip [status]="item.status"></app-status-chip>
            </div>
            <dl>
              <div>
                <dt>Date and time</dt>
                <dd>{{ item.scheduledAt ? (item.scheduledAt | date:'medium') : 'Not scheduled' }}</dd>
              </div>
              @if (item.location) {
                <div><dt>Location</dt><dd>{{ item.location }}</dd></div>
              }
              @if (item.notes) {
                <div><dt>Notes</dt><dd>{{ item.notes }}</dd></div>
              }
            </dl>
            <div class="payment-summary">
              <div><span>Total</span><strong>{{ item.totalAmount | currency:'INR':'symbol':'1.0-0':'en-IN' }}</strong></div>
              <div><span>Paid</span><strong>{{ item.paidAmount | currency:'INR':'symbol':'1.0-0':'en-IN' }}</strong></div>
              <div><span>Balance</span><strong>{{ item.balance | currency:'INR':'symbol':'1.0-0':'en-IN' }}</strong></div>
            </div>
          </section>

          <section class="payments-section">
            <h2>Payments</h2>
            @if (item.payments.length) {
              <ul class="payment-list rd-card">
                @for (payment of item.payments; track payment.id) {
                  <li>
                    <div>
                      <strong>{{ payment.kind | titlecase }}</strong>
                      <span>{{ payment.mode | titlecase }}</span>
                    </div>
                    <div class="payment-right">
                      <strong>{{ payment.amount | currency:'INR':'symbol':'1.0-0':'en-IN' }}</strong>
                      <time>{{ payment.paidOn | date:'mediumDate' }}</time>
                    </div>
                    @if (payment.note) {
                      <p>{{ payment.note }}</p>
                    }
                  </li>
                }
              </ul>
            } @else {
              <app-empty-state title="No payments yet" message="Payments for this booking will appear here."></app-empty-state>
            }
          </section>

          @if (isOpen()) {
            <section class="actions" aria-label="Booking actions">
              @if (item.balance > 0) {
                <button class="primary-action" type="button" (click)="recordPayment()">Record payment</button>
              }
              <button class="complete-action" type="button" (click)="completeBooking()">
                Mark completed &amp; collect {{ item.balance | currency:'INR':'symbol':'1.0-0':'en-IN' }}
              </button>
              <button class="cancel-action" type="button" (click)="cancelBooking()">Cancel booking</button>
            </section>
          }
        }
      </main>
    </ion-content>
  `,
  styles: [`
    .summary-card { display:grid; gap:18px; padding:18px; }
    .summary-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
    h2 { margin:0 0 5px; color:var(--rd-ink); font:500 22px Fraunces, Georgia, serif; }
    .summary-heading a { color:var(--rd-maroon); font-weight:600; }
    dl { display:grid; gap:12px; margin:0; }
    dl div { display:grid; gap:3px; }
    dt,.payment-right time { color:var(--rd-muted); font-size:13px; }
    dd { margin:0; color:var(--rd-ink); white-space:pre-wrap; }
    .payment-summary { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; padding-top:14px; border-top:1px solid var(--rd-border); }
    .payment-summary div { display:grid; min-width:0; gap:4px; }
    .payment-summary span { color:var(--rd-muted); font-size:13px; }
    .payment-summary strong { overflow-wrap:anywhere; color:var(--rd-ink); font-size:15px; }
    .payments-section h2 { margin:22px 0 12px; }
    .payment-list { display:grid; gap:0; margin:0; padding:0 16px; list-style:none; }
    .payment-list li { display:grid; grid-template-columns:1fr auto; gap:4px 10px; padding:14px 0; border-bottom:1px solid var(--rd-border); }
    .payment-list li:last-child { border-bottom:0; }
    .payment-list li > div:first-child,.payment-right { display:grid; gap:3px; }
    .payment-list li > div:first-child span { color:var(--rd-muted); font-size:13px; }
    .payment-right { justify-items:end; text-align:right; }
    .payment-list p { grid-column:1 / -1; margin:3px 0 0; color:var(--rd-muted); font-size:13px; }
    .actions { display:grid; gap:10px; margin-top:18px; }
    .actions button { min-height:48px; padding:0 14px; border-radius:12px; font:inherit; font-weight:700; }
    .primary-action { border:0; background:var(--rd-maroon); color:var(--rd-cream); }
    .complete-action { border:1px solid var(--rd-border); background:var(--rd-completed); color:var(--rd-ink); }
    .cancel-action { border:1px solid var(--rd-cancelled); background:transparent; color:var(--rd-maroon); }
    .detail-skeleton { display:grid; min-height:240px; align-content:center; gap:15px; padding:18px; }
    ion-skeleton-text { height:18px; }
    ion-skeleton-text:first-child { width:58%; }
    ion-skeleton-text:nth-child(2) { width:78%; }
    ion-skeleton-text:last-child { width:90%; }
  `],
  imports: [
    CurrencyPipe,
    DatePipe,
    EmptyStateComponent,
    IonContent,
    IonSkeletonText,
    PageHeaderComponent,
    StatusChipComponent,
    TitleCasePipe,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bookingService = inject(BookingService);
  private readonly modalController = inject(ModalController);
  private readonly toastController = inject(ToastController);

  readonly booking = signal<Booking | null>(null);
  readonly isLoading = signal(true);
  readonly loadFailed = signal(false);
  readonly skeletonRows = [0, 1, 2];
  private bookingId = 0;

  isOpen(): boolean {
    const status = this.booking()?.status;
    return status !== 'completed' && status !== 'cancelled';
  }

  ngOnInit(): void {
    this.bookingId = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(this.bookingId) || this.bookingId < 1) {
      this.loadFailed.set(true);
      this.isLoading.set(false);
      return;
    }
    void this.refresh();
  }

  edit(): void {
    if (this.isOpen()) {
      void this.router.navigate(['/bookings', this.bookingId, 'edit']);
    }
  }

  async recordPayment(): Promise<void> {
    const item = this.booking();
    if (!item || !this.isOpen() || item.balance <= 0) {
      return;
    }
    try {
      const result = await this.openActionModal('payment', item);
      if (result?.action !== 'payment') return;
      await firstValueFrom(this.bookingService.addPayment(this.bookingId, result));
      await this.refresh();
    } catch (error) {
      await this.showError(error);
    }
  }

  async completeBooking(): Promise<void> {
    const item = this.booking();
    if (!item || !this.isOpen()) {
      return;
    }
    try {
      const result = await this.openActionModal('complete', item);
      if (result?.action !== 'complete') return;
      const input: BookingCompleteInput = {
        mode: result.mode,
        paidOn: result.paidOn,
        ...(item.balance > 0 && result.amount < item.balance
          ? { amount: result.amount }
          : {}),
      };
      const response: BookingCompleteResult = await firstValueFrom(
        this.bookingService.complete(this.bookingId, input),
      );
      await this.refresh();
      if (response.remainingBalance > 0) {
        await this.showMessage(
          `Payment recorded. Remaining balance: ${this.formatRupees(response.remainingBalance)}.`,
        );
      }
    } catch (error) {
      await this.showError(error);
    }
  }

  async cancelBooking(): Promise<void> {
    const item = this.booking();
    if (!item || !this.isOpen()) {
      return;
    }
    try {
      const result = await this.openActionModal('cancel', item);
      if (result?.action !== 'cancel') return;
      await firstValueFrom(this.bookingService.cancel(this.bookingId, result));
      await this.refresh();
    } catch (error) {
      await this.showError(error);
    }
  }

  private async refresh(): Promise<void> {
    this.isLoading.set(true);
    try {
      this.booking.set(await firstValueFrom(this.bookingService.get(this.bookingId)));
      this.loadFailed.set(false);
    } catch (error) {
      this.loadFailed.set(true);
      await this.showError(error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async openActionModal(
    mode: BookingActionMode,
    booking: Booking,
  ): Promise<BookingActionResult | undefined> {
    const modal = await this.modalController.create({
      component: BookingActionModalComponent,
      componentProps: { mode, booking },
    });
    await modal.present();
    const result = await modal.onDidDismiss<BookingActionResult>();
    return result.role === 'confirm' ? result.data : undefined;
  }

  private formatRupees(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  private async showMessage(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3500,
      position: 'top',
      color: 'warning',
    });
    await toast.present();
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
