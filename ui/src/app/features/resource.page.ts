import { CurrencyPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonSkeletonText, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import {
  Booking,
  BookingSummary,
  Devotee,
  HistorySummary,
  HomamType,
  ScheduleItem,
} from '../core/models';
import { BookingService } from '../core/services/booking.service';
import { DevoteeService } from '../core/services/devotee.service';
import { HistoryService } from '../core/services/history.service';
import { HomamService } from '../core/services/homam.service';
import { ScheduleService } from '../core/services/schedule.service';
import { BookingCardComponent } from '../shared/components/booking-card/booking-card.component';
import { EmptyStateComponent } from '../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../shared/components/page-header/page-header.component';
import { StatusChipComponent } from '../shared/components/status-chip/status-chip.component';

type PageKind = 'bookings' | 'bookingDetail' | 'bookingCreate' | 'schedule' | 'devotees' | 'history';

function localDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

@Component({
  selector: 'app-feature-page',
  standalone: true,
  template: `
    <ion-content class="rd-page-content">
      <main class="rd-page-padding">
        <app-page-header
          eyebrow="RitualDesk"
          [title]="title()"
          [actionLabel]="page() === 'bookings' ? 'New booking' : ''"
          (action)="navigateToCreate()"
        ></app-page-header>

        @if (isLoading()) {
          <section class="loading-list" aria-label="Loading page data">
            @for (item of skeletonRows; track item) {
              <article class="skeleton-card rd-card">
                <ion-skeleton-text animated></ion-skeleton-text>
                <ion-skeleton-text animated></ion-skeleton-text>
                <ion-skeleton-text animated></ion-skeleton-text>
              </article>
            }
          </section>
        } @else if (loadFailed()) {
          <app-empty-state
            title="Data unavailable"
            message="The requested information could not be loaded. Please try again."
          ></app-empty-state>
        } @else {
          @if (page() === 'bookings') {
            @if (bookings().length) {
              <section class="card-list" aria-label="Bookings">
                @for (booking of bookings(); track booking.id) {
                  <app-booking-card
                    [booking]="booking"
                    (selected)="openBooking($event)"
                  ></app-booking-card>
                }
              </section>
            } @else {
              <app-empty-state
                title="No bookings yet"
                message="Bookings will appear here when they are added."
              ></app-empty-state>
            }
          }

          @if (page() === 'bookingDetail') {
            @if (booking(); as item) {
              <section class="detail-card rd-card">
                <div class="detail-heading">
                  <div>
                    <h2>{{ item.homamName }}</h2>
                    <p>{{ item.devoteeName }}</p>
                  </div>
                  <app-status-chip [status]="item.status"></app-status-chip>
                </div>
                <dl class="detail-grid">
                  <div><dt>Scheduled</dt><dd>{{ item.scheduledAt ? (item.scheduledAt | date:'medium') : 'Not scheduled' }}</dd></div>
                  <div><dt>Location</dt><dd>{{ item.location || 'Not specified' }}</dd></div>
                  <div><dt>Total</dt><dd>{{ item.totalAmount | currency:'INR':'symbol':'1.0-0':'en-IN' }}</dd></div>
                  <div><dt>Paid</dt><dd>{{ item.paidAmount | currency:'INR':'symbol':'1.0-0':'en-IN' }}</dd></div>
                  <div><dt>Balance</dt><dd>{{ item.balance | currency:'INR':'symbol':'1.0-0':'en-IN' }}</dd></div>
                  @if (item.notes) {
                    <div><dt>Notes</dt><dd>{{ item.notes }}</dd></div>
                  }
                </dl>
                <h3>Payments</h3>
                @if (item.payments.length) {
                  <ul class="payment-list">
                    @for (payment of item.payments; track payment.id) {
                      <li>
                        <span>{{ payment.kind | titlecase }} · {{ payment.mode | titlecase }}</span>
                        <strong>{{ payment.amount | currency:'INR':'symbol':'1.0-0':'en-IN' }}</strong>
                        <time>{{ payment.paidOn | date:'mediumDate' }}</time>
                      </li>
                    }
                  </ul>
                } @else {
                  <p class="muted">No payments recorded.</p>
                }
              </section>
            } @else {
              <app-empty-state
                title="Booking unavailable"
                message="This booking could not be found."
              ></app-empty-state>
            }
          }

          @if (page() === 'bookingCreate') {
            @if (homamTypes().length && devotees().length) {
              <form class="form-card rd-card" [formGroup]="form" (ngSubmit)="createBooking()" novalidate>
                <label for="homamTypeId">Homam</label>
                <select id="homamTypeId" formControlName="homamTypeId" (change)="useHomamDefaultAmount()" [attr.aria-invalid]="showFieldError('homamTypeId')">
                  <option [ngValue]="0">Select homam</option>
                  @for (homam of homamTypes(); track homam.id) {
                    <option [ngValue]="homam.id">{{ homam.name }}</option>
                  }
                </select>
                @if (showFieldError('homamTypeId')) {
                  <p class="field-error" role="alert">Select a homam.</p>
                }

                <label for="devoteeId">Devotee</label>
                <select id="devoteeId" formControlName="devoteeId" [attr.aria-invalid]="showFieldError('devoteeId')">
                  <option [ngValue]="0">Select devotee</option>
                  @for (devotee of devotees(); track devotee.id) {
                    <option [ngValue]="devotee.id">{{ devotee.name }}</option>
                  }
                </select>
                @if (showFieldError('devoteeId')) {
                  <p class="field-error" role="alert">Select a devotee.</p>
                }

                <label for="scheduledAt">Date and time</label>
                <input id="scheduledAt" type="datetime-local" formControlName="scheduledAt">

                <label for="location">Location</label>
                <input id="location" formControlName="location">

                <label for="totalAmount">Total amount (₹)</label>
                <input id="totalAmount" type="number" min="0" step="1" formControlName="totalAmount"
                  [attr.aria-invalid]="showFieldError('totalAmount')">
                @if (showFieldError('totalAmount')) {
                  <p class="field-error" role="alert">Enter a non-negative whole-rupee amount.</p>
                }

                <button type="submit" [disabled]="isSaving()">
                  {{ isSaving() ? 'Creating…' : 'Create booking' }}
                </button>
              </form>
            } @else {
              <app-empty-state
                title="Booking cannot be created yet"
                message="An active homam and at least one devotee are required."
              ></app-empty-state>
            }
          }

          @if (page() === 'schedule') {
            @if (schedule().length) {
              <section class="card-list" aria-label="Upcoming schedule">
                @for (item of schedule(); track item.type + item.id + item.time) {
                  <article class="schedule-card rd-card">
                    <div>
                      <strong>{{ item.title }}</strong>
                      <p>{{ item.time | date:'medium' }}</p>
                    </div>
                    <app-status-chip [status]="item.status"></app-status-chip>
                  </article>
                }
              </section>
            } @else {
              <app-empty-state
                title="No upcoming items"
                message="There are no bookings or rituals scheduled for the next seven days."
              ></app-empty-state>
            }
          }

          @if (page() === 'devotees') {
            @if (devotees().length) {
              <section class="card-list" aria-label="Devotees">
                @for (devotee of devotees(); track devotee.id) {
                  <article class="devotee-card rd-card">
                    <strong>{{ devotee.name }}</strong>
                    @if (devotee.phone) { <span>{{ devotee.phone }}</span> }
                    @if (devotee.address) { <span>{{ devotee.address }}</span> }
                    @if (devotee.notes) { <p>{{ devotee.notes }}</p> }
                  </article>
                }
              </section>
            } @else {
              <app-empty-state
                title="No devotees yet"
                message="Devotees will appear here when they are added."
              ></app-empty-state>
            }
          }

          @if (page() === 'history') {
            @if (history(); as month) {
              <section class="history-totals">
                <article class="rd-card"><span>Charged</span><strong>{{ month.totals.totalCharged | currency:'INR':'symbol':'1.0-0':'en-IN' }}</strong></article>
                <article class="rd-card"><span>Collected</span><strong>{{ month.totals.totalCollected | currency:'INR':'symbol':'1.0-0':'en-IN' }}</strong></article>
                <article class="rd-card"><span>Due</span><strong>{{ month.totals.totalDue | currency:'INR':'symbol':'1.0-0':'en-IN' }}</strong></article>
              </section>
              @if (month.items.length) {
                <section class="card-list" aria-label="Booking history">
                  @for (booking of month.items; track booking.id) {
                    <app-booking-card
                      [booking]="booking"
                      (selected)="openBooking($event)"
                    ></app-booking-card>
                  }
                </section>
              } @else {
                <app-empty-state
                  title="No history this month"
                  message="Completed and cancelled bookings will appear here."
                ></app-empty-state>
              }
            }
          }
        }
      </main>
    </ion-content>
  `,
  styles: [`
    .loading-list,.card-list { display:grid; gap:12px; }
    .skeleton-card { display:grid; min-height:112px; align-content:center; gap:12px; padding:16px; }
    ion-skeleton-text { height:16px; }
    ion-skeleton-text:first-child { width:55%; }
    ion-skeleton-text:nth-child(2) { width:80%; }
    ion-skeleton-text:last-child { width:65%; }
    .detail-card,.form-card { display:grid; gap:14px; padding:18px; }
    .detail-heading,.schedule-card { display:flex; align-items:center; justify-content:space-between; gap:12px; }
    h2,h3,p { margin:0; }
    h2 { color:var(--rd-ink); font:500 22px Fraunces, Georgia, serif; }
    h3 { margin-top:8px; color:var(--rd-ink); font:500 18px Fraunces, Georgia, serif; }
    .detail-heading p,.muted,.schedule-card p,.devotee-card span,.devotee-card p { margin-top:4px; color:var(--rd-muted); font-size:14px; }
    .detail-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:12px; margin:0; }
    .detail-grid div,.history-totals article { display:grid; gap:4px; }
    dt,.history-totals span { color:var(--rd-muted); font-size:13px; }
    dd { margin:0; color:var(--rd-ink); }
    .payment-list { display:grid; gap:8px; margin:0; padding:0; list-style:none; }
    .payment-list li { display:grid; grid-template-columns:1fr auto; gap:4px 10px; padding:10px 0; border-bottom:1px solid var(--rd-border); }
    .payment-list time { color:var(--rd-muted); font-size:13px; }
    .form-card label { color:var(--rd-ink); font-weight:600; }
    .form-card input,.form-card select { width:100%; min-height:var(--rd-tap-target); padding:0 12px; border:1px solid var(--rd-border); border-radius:10px; background:var(--rd-cream); color:var(--rd-ink); font:inherit; }
    .form-card [aria-invalid="true"] { border-color:var(--rd-maroon); }
    .field-error { margin:-8px 0 0; color:var(--rd-maroon); font-size:13px; }
    .form-card button { min-height:var(--rd-tap-target); border:0; border-radius:12px; background:var(--rd-maroon); color:var(--rd-cream); font:inherit; font-weight:700; }
    .form-card button:disabled { opacity:.65; }
    .schedule-card,.devotee-card { display:flex; align-items:center; justify-content:space-between; gap:12px; min-height:var(--rd-tap-target); padding:16px; color:var(--rd-ink); }
    .devotee-card { align-items:flex-start; flex-direction:column; }
    .history-totals { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; margin-bottom:16px; }
    .history-totals article { min-width:0; padding:12px; }
    .history-totals strong { overflow-wrap:anywhere; color:var(--rd-ink); font-size:14px; }
    @media (min-width:720px) { .history-totals strong { font-size:18px; } }
  `],
  imports: [
    BookingCardComponent,
    CurrencyPipe,
    DatePipe,
    EmptyStateComponent,
    IonContent,
    IonSkeletonText,
    PageHeaderComponent,
    ReactiveFormsModule,
    StatusChipComponent,
    TitleCasePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourcePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly bookingsApi = inject(BookingService);
  private readonly devoteesApi = inject(DevoteeService);
  private readonly homamsApi = inject(HomamService);
  private readonly scheduleApi = inject(ScheduleService);
  private readonly historyApi = inject(HistoryService);
  private readonly toastController = inject(ToastController);

  readonly page = signal<PageKind>('bookings');
  readonly title = signal('');
  readonly isLoading = signal(true);
  readonly loadFailed = signal(false);
  readonly isSaving = signal(false);
  readonly bookings = signal<BookingSummary[]>([]);
  readonly booking = signal<Booking | null>(null);
  readonly devotees = signal<Devotee[]>([]);
  readonly homamTypes = signal<HomamType[]>([]);
  readonly schedule = signal<ScheduleItem[]>([]);
  readonly history = signal<HistorySummary | null>(null);
  readonly skeletonRows = [0, 1, 2];
  readonly form = this.formBuilder.nonNullable.group({
    homamTypeId: [0, [Validators.required, Validators.min(1)]],
    devoteeId: [0, [Validators.required, Validators.min(1)]],
    scheduledAt: [''],
    location: [''],
    totalAmount: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
  });

  ngOnInit(): void {
    this.page.set(this.route.snapshot.data['page'] as PageKind);
    this.title.set(String(this.route.snapshot.data['title'] ?? 'RitualDesk'));
    void this.loadPage();
  }

  openBooking(id: number): void {
    void this.router.navigate(['/bookings', id]);
  }

  navigateToCreate(): void {
    void this.router.navigateByUrl('/bookings/new');
  }

  showFieldError(controlName: 'homamTypeId' | 'devoteeId' | 'totalAmount'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && control.touched;
  }

  useHomamDefaultAmount(): void {
    const selectedHomam = this.homamTypes().find(
      (homam) => homam.id === this.form.controls.homamTypeId.value,
    );
    if (selectedHomam) {
      this.form.controls.totalAmount.setValue(selectedHomam.defaultAmount);
    }
  }

  async createBooking(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.isSaving()) {
      return;
    }
    this.isSaving.set(true);
    try {
      const values = this.form.getRawValue();
      const created = await firstValueFrom(this.bookingsApi.create({
        homamTypeId: values.homamTypeId,
        devoteeId: values.devoteeId,
        scheduledAt: values.scheduledAt || null,
        location: values.location.trim() || null,
        totalAmount: values.totalAmount,
      }));
      await this.router.navigate(['/bookings', created.id]);
    } catch (error) {
      await this.showError(error);
    } finally {
      this.isSaving.set(false);
    }
  }

  private async loadPage(): Promise<void> {
    try {
      switch (this.page()) {
        case 'bookings':
          this.bookings.set(await firstValueFrom(this.bookingsApi.list()));
          break;
        case 'bookingDetail': {
          const id = Number(this.route.snapshot.paramMap.get('id'));
          if (!Number.isInteger(id) || id < 1) {
            this.booking.set(null);
            break;
          }
          this.booking.set(await firstValueFrom(this.bookingsApi.get(id)));
          break;
        }
        case 'bookingCreate': {
          const [homams, devotees] = await Promise.all([
            firstValueFrom(this.homamsApi.list()),
            firstValueFrom(this.devoteesApi.list()),
          ]);
          this.homamTypes.set(homams);
          this.devotees.set(devotees);
          break;
        }
        case 'schedule': {
          const from = new Date();
          const to = new Date(from);
          to.setDate(to.getDate() + 6);
          this.schedule.set(await firstValueFrom(
            this.scheduleApi.list(localDate(from), localDate(to)),
          ));
          break;
        }
        case 'devotees':
          this.devotees.set(await firstValueFrom(this.devoteesApi.list()));
          break;
        case 'history': {
          const today = new Date();
          const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
          this.history.set(await firstValueFrom(this.historyApi.list(month)));
          break;
        }
      }
    } catch (error) {
      this.loadFailed.set(true);
      await this.showError(error);
    } finally {
      this.isLoading.set(false);
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
