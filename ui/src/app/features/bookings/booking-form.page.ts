import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AlertController,
  IonContent,
  IonDatetime,
  IonModal,
  IonSkeletonText,
  ModalController,
  ToastController,
} from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { ApiError } from '../../core/models/api-error';
import {
  Booking,
  BookingCreateInput,
  BookingUpdateInput,
  Devotee,
  HomamType,
  PaymentMode,
  DevoteeInput,
} from '../../core/models';
import { BookingService } from '../../core/services/booking.service';
import { BookingDataRefreshService } from '../../core/services/booking-data-refresh.service';
import { DevoteeService } from '../../core/services/devotee.service';
import { HomamService } from '../../core/services/homam.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import {
  advanceDoesNotExceedTotalValidator,
  advanceModeRequiredValidator,
  bookingDateTimeValidator,
  nonNegativeIntegerValidator,
  totalNotBelowPaidValidator,
} from '../../shared/validators/booking.validators';
import { QuickDevoteeModalComponent } from './quick-devotee-modal.component';

function isPaymentMode(value: string): value is PaymentMode {
  return value === 'cash' || value === 'upi' || value === 'other';
}

@Component({
  selector: 'app-booking-form-page',
  standalone: true,
  template: `
    <ion-content class="rd-page-content">
      <main class="rd-page-padding">
        <app-page-header
          eyebrow="Bookings"
          [title]="isEdit() ? 'Edit booking' : 'New booking'"
        ></app-page-header>
        @if (isLoading()) {
          <article class="form-skeleton rd-card" aria-label="Loading booking form">
            <ion-skeleton-text animated></ion-skeleton-text>
            <ion-skeleton-text animated></ion-skeleton-text>
            <ion-skeleton-text animated></ion-skeleton-text>
          </article>
        } @else if (loadFailed()) {
          <app-empty-state title="Booking unavailable" message="This booking could not be loaded."></app-empty-state>
        } @else if (isReadOnly) {
          <section class="readonly-card rd-card">
            <div>
              <strong>Read-only booking</strong>
              <p>This {{ booking()?.status }} booking cannot be edited.</p>
            </div>
            <app-status-chip [status]="booking()?.status ?? ''"></app-status-chip>
          </section>
        } @else if (homams().length) {
          <form class="form-card rd-card" [formGroup]="form" (ngSubmit)="save()" novalidate>
            <label for="homamTypeId">Homam <span aria-hidden="true">*</span></label>
            <select id="homamTypeId" formControlName="homamTypeId"
              (change)="useHomamDefaultAmount()" [attr.aria-invalid]="hasFieldError('homamTypeId')">
              <option [ngValue]="0">Select homam</option>
              @for (homam of homams(); track homam.id) {
                <option [ngValue]="homam.id">{{ homam.name }}</option>
              }
            </select>
            @if (hasFieldError('homamTypeId')) {
              <p class="field-error" role="alert">Select a homam.</p>
            }
            @if (selectedHomam(); as homam) {
              @if (homam.itemsNeeded.length) {
                <section class="items-needed" aria-label="Items needed">
                  <strong>Items needed</strong>
                  <ul>
                    @for (item of homam.itemsNeeded; track item) {
                      <li>{{ item }}</li>
                    }
                  </ul>
                </section>
              }
            }

            <label for="devoteeId">Devotee <span aria-hidden="true">*</span></label>
            <div class="select-with-action">
              <select id="devoteeId" formControlName="devoteeId" [attr.aria-invalid]="hasFieldError('devoteeId')">
                <option [ngValue]="0">Select devotee</option>
                @for (devotee of devotees(); track devotee.id) {
                  <option [ngValue]="devotee.id">{{ devotee.name }}{{ devotee.phone ? ' · ' + devotee.phone : '' }}</option>
                }
              </select>
              <button type="button" class="outline-button" (click)="quickAddDevotee()">+ Add devotee</button>
            </div>
            @if (hasFieldError('devoteeId')) {
              <p class="field-error" role="alert">Select a devotee.</p>
            }
            @if (!devotees().length) {
              <p class="field-error">Add a devotee to continue.</p>
            }

            <div class="two-column">
              <div>
                <label for="scheduledDate">Date <span aria-hidden="true">*</span></label>
                <button id="scheduledDate" type="button" class="picker-button"
                  [class.invalid]="dateInvalid" (click)="openDatePicker()">
                  {{ dateLabel() }}
                </button>
                @if (hasFieldError('scheduledDate')) {
                  <p class="field-error" role="alert">Choose a date.</p>
                }
                @if (dateFormatInvalid) {
                  <p class="field-error" role="alert">Enter a valid date.</p>
                }
              </div>
              <div>
                <label for="scheduledTime">Time <span aria-hidden="true">*</span></label>
                <button id="scheduledTime" type="button" class="picker-button"
                  [class.invalid]="timeInvalid" (click)="openTimePicker()">
                  {{ timeLabel() }}
                </button>
                @if (hasFieldError('scheduledTime')) {
                  <p class="field-error" role="alert">Choose a time.</p>
                }
                @if (timeFormatInvalid) {
                  <p class="field-error" role="alert">Enter a valid time.</p>
                }
                @if (pastDateTime) {
                  <p class="field-error" role="alert">Choose a date and time that is not in the past.</p>
                }
              </div>
            </div>

            <label for="location">Location</label>
            <input id="location" formControlName="location">

            <label for="totalAmount">Total amount (₹) <span aria-hidden="true">*</span></label>
            <input id="totalAmount" type="number" min="0" step="1" formControlName="totalAmount"
              (input)="markTotalAmountEdited()"
              [attr.aria-invalid]="hasFieldError('totalAmount') || totalBelowPaid">
            @if (hasFieldError('totalAmount')) {
              <p class="field-error" role="alert">Enter a non-negative whole-rupee amount.</p>
            }
            @if (totalBelowPaid) {
              <p class="field-error" role="alert">Total cannot be lower than the amount already paid.</p>
            }

            @if (!isEdit()) {
              <label for="advanceAmount">Advance amount (₹)</label>
              <input id="advanceAmount" type="number" min="0" step="1" formControlName="advanceAmount"
                [attr.aria-invalid]="advanceInvalid">
              @if (advanceInvalid) {
                <p class="field-error" role="alert">
                  {{ form.controls.advanceAmount.invalid
                    ? 'Enter a non-negative whole-rupee amount.'
                    : 'Advance cannot exceed the total amount.' }}
                </p>
              }
              @if (form.controls.advanceAmount.value > 0) {
                <label for="advanceMode">Advance payment method <span aria-hidden="true">*</span></label>
                <select id="advanceMode" formControlName="advanceMode" [attr.aria-invalid]="advanceModeRequired">
                  <option value="">Select payment method</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="other">Other</option>
                </select>
                @if (advanceModeRequired) {
                  <p class="field-error" role="alert">Select how the advance was paid.</p>
                }
              }
              <p class="balance-preview">
                Balance after advance
                <strong>{{ liveBalance | currency:'INR':'symbol':'1.0-0':'en-IN' }}</strong>
              </p>
            }

            <label for="notes">Notes</label>
            <textarea id="notes" rows="3" formControlName="notes"></textarea>
            <button class="submit" type="submit" [disabled]="form.invalid || isSaving()">
              {{ isSaving() ? 'Saving…' : (isEdit() ? 'Save changes' : 'Create booking') }}
            </button>
          </form>
        } @else {
          <app-empty-state
            title="Booking cannot be created yet"
            message="Add an active homam before creating a booking."
          ></app-empty-state>
        }
      </main>

      <ion-modal [isOpen]="isDatePickerOpen()" (didDismiss)="isDatePickerOpen.set(false)">
        <ng-template>
          <section class="picker-sheet">
            <h2>Choose date</h2>
            <ion-datetime
              presentation="date"
              locale="en-IN"
              [value]="datePickerValue()"
              [min]="todayDate"
              (ionChange)="setDatePickerValue($event.detail.value)"
            ></ion-datetime>
            <div class="picker-actions">
              <button type="button" class="picker-cancel" (click)="closeDatePicker()">Cancel</button>
              <button type="button" (click)="confirmDatePicker()">Done</button>
            </div>
          </section>
        </ng-template>
      </ion-modal>

      <ion-modal [isOpen]="isTimePickerOpen()" (didDismiss)="isTimePickerOpen.set(false)">
        <ng-template>
          <section class="picker-sheet">
            <h2>Choose time</h2>
            <ion-datetime
              presentation="time"
              locale="en-IN"
              hour-cycle="h12"
              [value]="timePickerValue()"
              [min]="minimumTime"
              (ionChange)="setTimePickerValue($event.detail.value)"
            ></ion-datetime>
            <div class="picker-actions">
              <button type="button" class="picker-cancel" (click)="closeTimePicker()">Cancel</button>
              <button type="button" (click)="confirmTimePicker()">Done</button>
            </div>
          </section>
        </ng-template>
      </ion-modal>
    </ion-content>
  `,
  styles: [`
    .form-card,.form-skeleton { display:grid; gap:10px; padding:18px; }
    .form-card label { margin-top:4px; color:var(--rd-ink); font-weight:600; }
    .form-card input,.form-card select,.form-card textarea { width:100%; min-height:48px; padding:10px 12px; border:1px solid var(--rd-border); border-radius:10px; background:var(--rd-cream); color:var(--rd-ink); font:inherit; }
    .form-card .picker-button { width:100%; padding:10px 12px; border:1px solid var(--rd-border); border-radius:10px; background:var(--rd-cream); color:var(--rd-ink); text-align:left; font:inherit; }
    .form-card .picker-button.invalid { border-color:var(--rd-maroon); }
    .form-card textarea { resize:vertical; }
    .form-card [aria-invalid="true"] { border-color:var(--rd-maroon); }
    .field-error { margin:0; color:var(--rd-maroon); font-size:13px; }
    .items-needed { padding:10px 12px; border-radius:10px; background:var(--rd-completed); color:var(--rd-ink); }
    .items-needed ul { display:flex; flex-wrap:wrap; gap:6px 20px; margin:8px 0 0; padding-left:20px; }
    .select-with-action,.two-column { display:grid; grid-template-columns:1fr auto; align-items:end; gap:8px; }
    .two-column { grid-template-columns:1fr 1fr; }
    .outline-button { min-height:48px; padding:0 12px; border:1px solid var(--rd-border); border-radius:10px; background:transparent; color:var(--rd-maroon); font:inherit; }
    .balance-preview { display:flex; align-items:center; justify-content:space-between; margin:0; padding:12px; border-radius:10px; background:var(--rd-completed); color:var(--rd-ink); }
    .submit { min-height:48px; margin-top:8px; border:0; border-radius:12px; background:var(--rd-maroon); color:var(--rd-cream); font:inherit; font-weight:700; }
    .submit:disabled { opacity:.65; }
    .readonly-card { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:18px; }
    .readonly-card p { margin:0; }
    .picker-sheet { display:grid; justify-items:center; gap:14px; padding:20px 16px calc(20px + env(safe-area-inset-bottom)); background:var(--rd-cream); color:var(--rd-ink); }
    .picker-sheet h2 { margin:0; font:500 22px Fraunces,Georgia,serif; }
    .picker-actions { display:flex; width:100%; justify-content:flex-end; gap:8px; }
    .picker-actions button { min-width:88px; min-height:48px; padding:0 14px; border:0; border-radius:10px; background:var(--rd-maroon); color:var(--rd-cream); font:inherit; font-weight:700; }
    .picker-actions .picker-cancel { border:1px solid var(--rd-border); background:transparent; color:var(--rd-ink); }
    ion-datetime { --background:var(--rd-cream); --wheel-highlight-background:var(--rd-completed); --wheel-fade-background-rgb:251,246,238; }
    .form-skeleton { min-height:250px; align-content:start; }
    .form-skeleton ion-skeleton-text { height:18px; margin:8px 0; }
    @media (max-width:420px) { .select-with-action { grid-template-columns:1fr; } }
  `],
  imports: [
    CurrencyPipe,
    EmptyStateComponent,
    IonContent,
    IonDatetime,
    IonModal,
    IonSkeletonText,
    PageHeaderComponent,
    ReactiveFormsModule,
    StatusChipComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingFormPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bookingService = inject(BookingService);
  private readonly bookingDataRefresh = inject(BookingDataRefreshService);
  private readonly homamService = inject(HomamService);
  private readonly devoteeService = inject(DevoteeService);
  private readonly modalController = inject(ModalController);
  private readonly alerts = inject(AlertController);
  private readonly toastController = inject(ToastController);

  readonly booking = signal<Booking | null>(null);
  readonly bookingId = signal<number | null>(null);
  readonly totalAmountEdited = signal(false);
  readonly todayDate = this.localDateText(new Date());
  readonly isDatePickerOpen = signal(false);
  readonly isTimePickerOpen = signal(false);
  readonly datePickerValue = signal(this.todayDate);
  readonly timePickerValue = signal(this.localDateText(new Date()) + 'T12:00:00');
  readonly form = this.formBuilder.nonNullable.group({
    homamTypeId: [0, [Validators.required, Validators.min(1)]],
    devoteeId: [0, [Validators.required, Validators.min(1)]],
    scheduledDate: ['', Validators.required],
    scheduledTime: ['', Validators.required],
    location: [''],
    totalAmount: [0, [Validators.required, nonNegativeIntegerValidator]],
    advanceAmount: [0, nonNegativeIntegerValidator],
    advanceMode: ['' as PaymentMode | '', []],
    notes: [''],
  }, {
    validators: [
      advanceDoesNotExceedTotalValidator,
      advanceModeRequiredValidator,
      bookingDateTimeValidator(),
      totalNotBelowPaidValidator(() => this.booking()?.paidAmount ?? 0),
    ],
  });
  readonly isEdit = signal(false);
  readonly isLoading = signal(true);
  readonly loadFailed = signal(false);
  readonly isSaving = signal(false);
  readonly homams = signal<HomamType[]>([]);
  readonly devotees = signal<Devotee[]>([]);

  get liveBalance(): number {
    return Number(this.form.controls.totalAmount.value) - Number(this.form.controls.advanceAmount.value);
  }

  get minimumTime(): string {
    if (this.form.controls.scheduledDate.value !== this.todayDate) {
      return `${this.form.controls.scheduledDate.value || this.todayDate}T00:00:00`;
    }
    const now = new Date();
    now.setSeconds(0, 0);
    now.setMinutes(now.getMinutes() + 1);
    return `${this.todayDate}T${this.localTimeText(now)}:00`;
  }

  get advanceInvalid(): boolean {
    const control = this.form.controls.advanceAmount;
    return control.invalid || this.form.hasError('advanceExceedsTotal');
  }

  get advanceModeRequired(): boolean {
    return this.form.hasError('advanceModeRequired');
  }

  get totalBelowPaid(): boolean {
    return this.form.hasError('totalBelowPaid') && this.form.controls.totalAmount.touched;
  }

  get pastDateTime(): boolean {
    return this.form.hasError('pastDateTime')
      && this.form.controls.scheduledDate.touched
      && this.form.controls.scheduledTime.touched;
  }

  get dateFormatInvalid(): boolean {
    return this.form.hasError('invalidDateTime') && this.form.controls.scheduledDate.touched;
  }

  get timeFormatInvalid(): boolean {
    return this.form.hasError('invalidDateTime') && this.form.controls.scheduledTime.touched;
  }

  get dateInvalid(): boolean {
    return this.hasFieldError('scheduledDate') || this.dateFormatInvalid || this.pastDateTime;
  }

  get timeInvalid(): boolean {
    return this.hasFieldError('scheduledTime') || this.timeFormatInvalid || this.pastDateTime;
  }

  get isReadOnly(): boolean {
    const status = this.booking()?.status;
    return status === 'completed' || status === 'cancelled';
  }

  ngOnInit(): void {
    const editMode = this.route.snapshot.data['mode'] === 'edit';
    this.isEdit.set(editMode);
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (editMode && Number.isInteger(id) && id > 0) {
      this.bookingId.set(id);
    }
    void this.loadInitial();
  }

  hasFieldError(
    controlName: 'homamTypeId' | 'devoteeId' | 'totalAmount' | 'scheduledDate' | 'scheduledTime',
  ): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && control.touched;
  }

  selectedHomam(): HomamType | undefined {
    return this.homams().find((homam) => homam.id === this.form.controls.homamTypeId.value);
  }

  dateLabel(): string {
    const value = this.form.controls.scheduledDate.value;
    if (!value) return 'Choose date';
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  timeLabel(): string {
    const value = this.form.controls.scheduledTime.value;
    if (!value) return 'Choose time';
    const [hourText, minuteText] = value.split(':');
    const hour = Number(hourText);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const twelveHour = hour % 12 || 12;
    return `${twelveHour}:${minuteText} ${suffix}`;
  }

  openDatePicker(): void {
    this.form.controls.scheduledDate.markAsTouched();
    this.datePickerValue.set(this.form.controls.scheduledDate.value || this.todayDate);
    this.isDatePickerOpen.set(true);
  }

  setDatePickerValue(value: unknown): void {
    if (typeof value === 'string') {
      this.datePickerValue.set(value.slice(0, 10));
    }
  }

  confirmDatePicker(): void {
    this.form.controls.scheduledDate.setValue(this.datePickerValue());
    this.form.controls.scheduledDate.markAsDirty();
    this.closeDatePicker();
  }

  closeDatePicker(): void {
    this.isDatePickerOpen.set(false);
  }

  openTimePicker(): void {
    this.form.controls.scheduledTime.markAsTouched();
    const date = this.form.controls.scheduledDate.value || this.todayDate;
    const time = this.form.controls.scheduledTime.value || '12:00';
    this.timePickerValue.set(`${date}T${time}:00`);
    this.isTimePickerOpen.set(true);
  }

  setTimePickerValue(value: unknown): void {
    if (typeof value === 'string') {
      const match = /T(\d{2}):(\d{2})/.exec(value);
      if (match) {
        this.timePickerValue.set(value);
      }
    }
  }

  confirmTimePicker(): void {
    const match = /T(\d{2}):(\d{2})/.exec(this.timePickerValue());
    if (match) {
      this.form.controls.scheduledTime.setValue(`${match[1]}:${match[2]}`);
      this.form.controls.scheduledTime.markAsDirty();
    }
    this.closeTimePicker();
  }

  closeTimePicker(): void {
    this.isTimePickerOpen.set(false);
  }

  useHomamDefaultAmount(): void {
    const homam = this.selectedHomam();
    if (homam && !this.totalAmountEdited()) {
      this.form.controls.totalAmount.setValue(homam.defaultAmount);
    }
  }

  markTotalAmountEdited(): void {
    this.totalAmountEdited.set(true);
  }

  async quickAddDevotee(): Promise<void> {
    const modal = await this.modalController.create({
      component: QuickDevoteeModalComponent,
    });
    await modal.present();
    const result = await modal.onDidDismiss<DevoteeInput>();
    if (result.role !== 'confirm' || !result.data) {
      return;
    }
    try {
      const devotee = await firstValueFrom(this.devoteeService.create(result.data));
      this.devotees.update((current) =>
        [...current, devotee].sort((left, right) => left.name.localeCompare(right.name)),
      );
      this.form.controls.devoteeId.setValue(devotee.id);
    } catch (error) {
      await this.showError(error);
    }
  }

  async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    try {
      const values = this.form.getRawValue();
      const scheduledAt = values.scheduledDate && values.scheduledTime
        ? `${values.scheduledDate}T${values.scheduledTime}`
        : null;
      if (this.isEdit()) {
        const input: BookingUpdateInput = {
          homamTypeId: values.homamTypeId,
          devoteeId: values.devoteeId,
          scheduledAt,
          location: values.location.trim() || null,
          totalAmount: values.totalAmount,
          notes: values.notes.trim() || null,
        };
        const id = this.bookingId();
        if (id === null) {
          throw new Error('Booking id is missing.');
        }
        await firstValueFrom(this.bookingService.update(id, input));
        this.bookingDataRefresh.refresh();
        await this.showSavedToast();
        await this.router.navigate(['/bookings', id]);
        return;
      }

      const input: BookingCreateInput = {
        homamTypeId: values.homamTypeId,
        devoteeId: values.devoteeId,
        scheduledAt,
        location: values.location.trim() || null,
        totalAmount: values.totalAmount,
        advanceAmount: values.advanceAmount,
        ...(values.advanceAmount > 0 && isPaymentMode(values.advanceMode)
          ? { advanceMode: values.advanceMode }
          : {}),
        notes: values.notes.trim() || null,
      };
      let created: Booking;
      try {
        created = await firstValueFrom(this.bookingService.create(input));
      } catch (error) {
        if (!this.isClash(error)) {
          throw error;
        }
        const confirm = await this.confirmClash();
        if (!confirm) {
          return;
        }
        created = await firstValueFrom(this.bookingService.create(input, true));
      }
      this.bookingDataRefresh.refresh();
      await this.showSavedToast();
      await this.router.navigate(['/bookings', created.id]);
    } catch (error) {
      await this.showError(error);
    } finally {
      this.isSaving.set(false);
    }
  }

  private async loadInitial(): Promise<void> {
    try {
      const [homams, devotees] = await Promise.all([
        firstValueFrom(this.homamService.list()),
        firstValueFrom(this.devoteeService.list()),
      ]);
      this.homams.set(homams);
      this.devotees.set(devotees);

      const id = this.bookingId();
      if (this.isEdit() && id !== null) {
        const booking = await firstValueFrom(this.bookingService.get(id));
        this.booking.set(booking);
        if (!this.isReadOnly) {
          const schedule = booking.scheduledAt?.split('T');
          this.form.patchValue({
            homamTypeId: booking.homamTypeId,
            devoteeId: booking.devoteeId,
            scheduledDate: schedule?.[0] ?? '',
            scheduledTime: schedule?.[1]?.slice(0, 5) ?? '',
            location: booking.location ?? '',
            totalAmount: booking.totalAmount,
            notes: booking.notes ?? '',
          });
        }
      }
    } catch (error) {
      this.loadFailed.set(true);
      await this.showError(error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private isClash(error: unknown): boolean {
    return error instanceof ApiError && error.code === '409';
  }

  private async confirmClash(): Promise<boolean> {
    const alert = await this.alerts.create({
      header: 'Schedule conflict',
      message: 'Another booking is at this time. Book anyway?',
      buttons: [
        { text: 'Choose another time', role: 'cancel' },
        { text: 'Book anyway', role: 'confirm' },
      ],
    });
    await alert.present();
    const result = await alert.onDidDismiss();
    return result.role === 'confirm';
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

  private async showSavedToast(): Promise<void> {
    const toast = await this.toastController.create({
      message: 'Booking saved',
      duration: 2500,
      position: 'top',
      color: 'success',
    });
    await toast.present();
  }

  private localDateText(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private localTimeText(date: Date): string {
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${hour}:${minute}`;
  }
}
