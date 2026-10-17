import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, Input, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular';
import { Booking, PaymentKind, PaymentMode } from '../../core/models';

export type BookingActionMode = 'payment' | 'complete' | 'cancel';

export type BookingActionResult =
  | {
      action: 'payment';
      amount: number;
      kind: 'advance' | 'part' | 'final';
      mode: PaymentMode;
      paidOn: string;
      note: string;
    }
  | {
      action: 'complete';
      amount: number;
      mode: PaymentMode;
      paidOn: string;
    }
  | {
      action: 'cancel';
      refundAmount: number;
      note: string;
    };

function currentDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

@Component({
  selector: 'app-booking-action-modal',
  standalone: true,
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ heading }}</ion-title>
        <ion-buttons slot="end">
          <ion-button type="button" (click)="dismiss()">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="rd-page-content">
      <form class="action-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        @if (mode !== 'cancel') {
          @if (mode === 'complete') {
            <p class="hint">Balance due: {{ booking.balance | currency:'INR':'symbol':'1.0-0':'en-IN' }}</p>
          }
          @if (mode === 'payment' || booking.balance > 0) {
            <label for="amount">{{ mode === 'complete' ? 'Amount to collect (₹)' : 'Amount (₹)' }}</label>
            <input id="amount" type="number" min="1" step="1" formControlName="amount"
              [attr.max]="mode === 'payment' ? booking.balance : booking.balance"
              [attr.aria-invalid]="showAmountError">
            @if (showAmountError) {
              <p class="field-error" role="alert">
                Enter a whole-rupee amount from ₹1 to {{ booking.balance }}.
              </p>
            }
          }
          @if (mode === 'payment') {
            <label for="kind">Payment kind</label>
            <select id="kind" formControlName="kind">
              <option value="advance">Advance</option>
              <option value="part">Part</option>
              <option value="final">Final</option>
            </select>
          }
          <label for="paymentMode">Payment method</label>
          <select id="paymentMode" formControlName="paymentMode">
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="other">Other</option>
          </select>
          <label for="paidOn">Date</label>
          <input id="paidOn" type="date" formControlName="paidOn">
        } @else {
          <p class="hint">Amount already paid: {{ booking.paidAmount | currency:'INR':'symbol':'1.0-0':'en-IN' }}</p>
          <label for="refundAmount">Refund amount (₹), optional</label>
          <input id="refundAmount" type="number" min="0" step="1" formControlName="refundAmount"
            [attr.max]="booking.paidAmount" [attr.aria-invalid]="showRefundError">
          @if (showRefundError) {
            <p class="field-error" role="alert">
              Refund must be a whole-rupee amount between ₹0 and {{ booking.paidAmount }}.
            </p>
          }
        }

        @if (mode !== 'complete') {
          <label for="note">{{ mode === 'cancel' ? 'Cancellation note' : 'Note' }}</label>
          <textarea id="note" rows="3" formControlName="note"></textarea>
        }

        <button class="submit" type="submit" [disabled]="!validAmount">
          {{ mode === 'payment' ? 'Record payment' : mode === 'complete' ? 'Confirm completion' : 'Cancel booking' }}
        </button>
      </form>
    </ion-content>
  `,
  styles: [`
    ion-toolbar { --background:var(--rd-cream); --color:var(--rd-ink); }
    .action-form { display:grid; width:100%; box-sizing:border-box; gap:10px; padding:20px 16px calc(20px + env(safe-area-inset-bottom)); }
    label { min-width:0; margin-top:4px; color:var(--rd-ink); font-weight:600; }
    input,select,textarea { width:100%; min-width:0; box-sizing:border-box; min-height:48px; padding:10px 12px; border:1px solid var(--rd-border); border-radius:10px; background:var(--rd-cream); color:var(--rd-ink); font:inherit; }
    textarea { resize:vertical; }
    [aria-invalid="true"] { border-color:var(--rd-maroon); }
    .field-error { margin:0; color:var(--rd-maroon); font-size:13px; }
    .hint { margin:0; padding:10px; border-radius:10px; background:var(--rd-completed); color:var(--rd-ink); }
    .submit { min-height:48px; margin-top:8px; border:0; border-radius:12px; background:var(--rd-maroon); color:var(--rd-cream); font:inherit; font-weight:700; }
    .submit:disabled { opacity:.55; }
  `],
  imports: [
    CurrencyPipe,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    ReactiveFormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingActionModalComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly modalController = inject(ModalController);

  @Input({ required: true }) mode!: BookingActionMode;
  @Input({ required: true }) booking!: Booking;

  readonly form = this.formBuilder.nonNullable.group({
    amount: [0, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
    kind: ['part' as Extract<PaymentKind, 'advance' | 'part' | 'final'>],
    paymentMode: ['cash' as PaymentMode],
    paidOn: [currentDate(), Validators.required],
    refundAmount: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
    note: [''],
  });

  ngOnInit(): void {
    this.form.patchValue({
      amount: this.booking.balance,
      refundAmount: 0,
    });
  }

  get heading(): string {
    if (this.mode === 'payment') return 'Record payment';
    if (this.mode === 'complete') return 'Complete booking';
    return 'Cancel booking';
  }

  get showAmountError(): boolean {
    const control = this.form.controls.amount;
    return control.touched && (control.invalid || control.value > this.booking.balance);
  }

  get showRefundError(): boolean {
    const control = this.form.controls.refundAmount;
    return control.touched && (control.invalid || control.value > this.booking.paidAmount);
  }

  get validAmount(): boolean {
    if (this.mode === 'cancel') {
      const amount = this.form.controls.refundAmount.value;
      return this.form.controls.refundAmount.valid && amount <= this.booking.paidAmount;
    }
    if (this.mode === 'complete' && this.booking.balance === 0) return true;
    const amount = this.form.controls.amount.value;
    return this.form.controls.amount.valid && amount <= this.booking.balance;
  }

  dismiss(): void {
    void this.modalController.dismiss(undefined, 'cancel');
  }

  submit(): void {
    if (!this.validAmount) {
      this.form.controls.amount.markAsTouched();
      this.form.controls.refundAmount.markAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    let result: BookingActionResult;
    if (this.mode === 'payment') {
      result = {
        action: 'payment',
        amount: value.amount,
        kind: value.kind,
        mode: value.paymentMode,
        paidOn: value.paidOn,
        note: value.note.trim(),
      };
    } else if (this.mode === 'complete') {
      result = {
        action: 'complete',
        amount: value.amount,
        mode: value.paymentMode,
        paidOn: value.paidOn,
      };
    } else {
      result = {
        action: 'cancel',
        refundAmount: value.refundAmount,
        note: value.note.trim(),
      };
    }
    void this.modalController.dismiss(result, 'confirm');
  }
}
