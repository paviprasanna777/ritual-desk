import { FormControl, FormGroup, Validators } from '@angular/forms';
import {
  advanceDoesNotExceedTotalValidator,
  bookingDateTimeValidator,
  nonNegativeIntegerValidator,
  totalNotBelowPaidValidator,
} from './booking.validators';

describe('booking form validators', () => {
  it('rejects an advance greater than the total', () => {
    const form = new FormGroup({
      totalAmount: new FormControl(100),
      advanceAmount: new FormControl(101),
    }, { validators: advanceDoesNotExceedTotalValidator });

    expect(form.hasError('advanceExceedsTotal')).toBe(true);
    form.controls.advanceAmount.setValue(100);
    expect(form.hasError('advanceExceedsTotal')).toBe(false);
  });

  it('rejects an edited total below the amount already paid', () => {
    const form = new FormGroup({
      totalAmount: new FormControl(99),
    }, { validators: totalNotBelowPaidValidator(() => 100) });

    expect(form.hasError('totalBelowPaid')).toBe(true);
    form.controls.totalAmount.setValue(100);
    expect(form.hasError('totalBelowPaid')).toBe(false);
  });

  it('accepts only whole non-negative rupee values', () => {
    const control = new FormControl<unknown>(0, nonNegativeIntegerValidator);
    expect(control.valid).toBe(true);
    control.setValue(null);
    expect(control.hasError('nonNegativeInteger')).toBe(true);
    control.setValue(-1);
    expect(control.hasError('nonNegativeInteger')).toBe(true);
    control.setValue(1.5);
    expect(control.hasError('nonNegativeInteger')).toBe(true);
  });

  it('rejects past local date and time and accepts a current or future time', () => {
    const now = () => new Date(2026, 9, 17, 13, 30);
    const form = new FormGroup({
      scheduledDate: new FormControl('2026-10-17', Validators.required),
      scheduledTime: new FormControl('13:29', Validators.required),
    }, { validators: bookingDateTimeValidator(now) });

    expect(form.hasError('pastDateTime')).toBe(true);
    form.controls.scheduledTime.setValue('13:30');
    expect(form.hasError('pastDateTime')).toBe(false);
    form.controls.scheduledDate.setValue('2026-10-18');
    form.controls.scheduledTime.setValue('09:00');
    expect(form.hasError('pastDateTime')).toBe(false);
  });
});
