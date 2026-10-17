import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const nonNegativeIntegerValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const value: unknown = control.value;
  if (value === null || value === undefined || value === '') {
    return { nonNegativeInteger: true };
  }
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? null
    : { nonNegativeInteger: true };
};

export const advanceDoesNotExceedTotalValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const total = control.get('totalAmount')?.value;
  const advance = control.get('advanceAmount')?.value;
  if (typeof total !== 'number' || typeof advance !== 'number') {
    return null;
  }
  return advance <= total ? null : { advanceExceedsTotal: true };
};

export const advanceModeRequiredValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const advance = control.get('advanceAmount')?.value;
  const mode = control.get('advanceMode')?.value;
  return typeof advance === 'number' && advance > 0 && !mode
    ? { advanceModeRequired: true }
    : null;
};

export function totalNotBelowPaidValidator(paidAmount: () => number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const total = control.get('totalAmount')?.value;
    return typeof total === 'number' && total < paidAmount()
      ? { totalBelowPaid: true }
      : null;
  };
}

export function bookingDateTimeValidator(now: () => Date = () => new Date()): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const dateValue: unknown = control.get('scheduledDate')?.value;
    const timeValue: unknown = control.get('scheduledTime')?.value;
    if (typeof dateValue !== 'string' || typeof timeValue !== 'string'
      || dateValue === '' || timeValue === '') {
      return null;
    }

    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
    const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeValue);
    if (!dateMatch || !timeMatch) {
      return { invalidDateTime: true };
    }
    const [, yearText, monthText, dayText] = dateMatch;
    const [, hourText, minuteText] = timeMatch;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const hour = Number(hourText);
    const minute = Number(minuteText);
    const scheduled = new Date(year, month - 1, day, hour, minute);
    if (
      scheduled.getFullYear() !== year
      || scheduled.getMonth() !== month - 1
      || scheduled.getDate() !== day
      || scheduled.getHours() !== hour
      || scheduled.getMinutes() !== minute
    ) {
      return { invalidDateTime: true };
    }
    return scheduled.getTime() < now().getTime() ? { pastDateTime: true } : null;
  };
}
