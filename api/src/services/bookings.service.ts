import { HttpError } from '../middleware/error.middleware';
import type {
  BookingFilters,
  BookingInput,
  PaymentInput,
  createBookingsRepository,
} from '../repositories/bookings.repository';
import type { createRemindersRepository } from '../repositories/reminders.repository';

type BookingRepository = ReturnType<typeof createBookingsRepository>;
type ReminderRepository = ReturnType<typeof createRemindersRepository>;

function notFound(): never {
  throw new HttpError(404, 'Booking not found');
}
function conflict(message: string): never {
  throw new HttpError(409, message);
}

function currentDateTime(): string {
  return new Date().toISOString();
}

function currentDate(): string {
  return currentDateTime().slice(0, 10);
}

function getBooking(repository: BookingRepository, id: number) {
  const booking = repository.findById(id);
  if (!booking) throw new HttpError(404, 'Booking not found');
  return booking;
}

function withPayments(repository: BookingRepository, id: number) {
  return { ...getBooking(repository, id), payments: repository.payments(id) };
}

export function createBookingsService(
  repository: BookingRepository,
  reminders: ReminderRepository,
) {
  return {
    list(filters: BookingFilters) {
      return repository.list(filters);
    },

    get(id: number) {
      return withPayments(repository, id);
    },

    create(input: {
      homamTypeId: number;
      devoteeId: number;
      scheduledAt?: string | null;
      location?: string | null;
      totalAmount?: number;
      advanceAmount?: number;
      advanceMode?: 'cash' | 'upi' | 'other';
      notes?: string | null;
    }, force: boolean) {
      return repository.transaction(() => {
        const defaultAmount = repository.homamDefaultAmount(input.homamTypeId);
        if (defaultAmount === undefined) {
          throw new HttpError(404, 'Homam type not found');
        }
        if (!repository.devoteeExists(input.devoteeId)) {
          throw new HttpError(404, 'Devotee not found');
        }

        const totalAmount = input.totalAmount ?? defaultAmount;
        const advanceAmount = input.advanceAmount ?? 0;
        if (advanceAmount > totalAmount) {
          throw new HttpError(409, 'Advance cannot exceed the total amount');
        }

        const scheduledAt = input.scheduledAt ?? null;
        if (scheduledAt && !force && repository.hasClash(scheduledAt)) {
          conflict('Another booking is already scheduled at this time');
        }

        const bookingInput: BookingInput = {
          homamTypeId: input.homamTypeId,
          devoteeId: input.devoteeId,
          scheduledAt,
          location: input.location ?? null,
          totalAmount,
          status: scheduledAt ? 'scheduled' : 'booked',
          notes: input.notes ?? null,
        };
        const id = repository.insertBooking(bookingInput);
        reminders.replaceAutoForBooking(id, scheduledAt);
        if (advanceAmount > 0) {
          repository.insertPayment(id, {
            amount: advanceAmount,
            kind: 'advance',
            mode: input.advanceMode!,
            paidOn: currentDate(),
            note: null,
          });
        }
        return withPayments(repository, id);
      });
    },

    update(id: number, changes: {
      homamTypeId?: number;
      devoteeId?: number;
      scheduledAt?: string | null;
      location?: string | null;
      totalAmount?: number;
      notes?: string | null;
    }) {
      return repository.transaction(() => {
        const current = getBooking(repository, id);
        if (current.status === 'completed' || current.status === 'cancelled') {
          conflict('Completed or cancelled bookings cannot be edited');
        }
        const homamTypeId = changes.homamTypeId ?? Number(current.homam_type_id);
        const devoteeId = changes.devoteeId ?? Number(current.devotee_id);
        if (repository.homamDefaultAmount(homamTypeId) === undefined) {
          throw new HttpError(404, 'Homam type not found');
        }
        if (!repository.devoteeExists(devoteeId)) {
          throw new HttpError(404, 'Devotee not found');
        }
        const scheduledAt = changes.scheduledAt === undefined
          ? current.scheduled_at as string | null
          : changes.scheduledAt;
        if (
          changes.scheduledAt !== undefined
          && scheduledAt !== current.scheduled_at
          && scheduledAt !== null
          && repository.hasClash(scheduledAt, id)
        ) {
          conflict('Another booking is already scheduled at this time');
        }
        const totalAmount = changes.totalAmount ?? Number(current.total_amount);
        if (totalAmount < Number(current.paid_amount)) {
          conflict('Total amount cannot be less than the amount already paid');
        }
        repository.updateBooking(id, {
          homamTypeId,
          devoteeId,
          scheduledAt,
          location: changes.location === undefined
            ? current.location as string | null
            : changes.location,
          totalAmount,
          status: scheduledAt ? 'scheduled' : 'booked',
          notes: changes.notes === undefined
            ? current.notes as string | null
            : changes.notes,
        });
        if (scheduledAt !== current.scheduled_at) {
          reminders.replaceAutoForBooking(id, scheduledAt);
        }
        return withPayments(repository, id);
      });
    },

    addPayment(id: number, payment: Omit<PaymentInput, 'note'> & { note?: string | null }) {
      return repository.transaction(() => {
        const booking = getBooking(repository, id);
        if (booking.status === 'cancelled') {
          conflict('Payments cannot be added to a cancelled booking');
        }
        const paidAmount = Number(booking.paid_amount);
        if (payment.kind === 'refund') {
          if (payment.amount > paidAmount) {
            conflict('Refund cannot exceed the amount paid');
          }
        } else if (payment.amount > Number(booking.balance)) {
          conflict('Payment cannot exceed the remaining balance');
        }
        repository.insertPayment(id, { ...payment, note: payment.note ?? null });
        return withPayments(repository, id);
      });
    },

    complete(
      id: number,
      input: { mode: 'cash' | 'upi' | 'other'; paidOn: string; amount?: number },
    ) {
      return repository.transaction(() => {
        const booking = getBooking(repository, id);
        if (booking.status === 'completed' || booking.status === 'cancelled') {
          conflict('Completed or cancelled bookings cannot be completed');
        }
        const balance = Number(booking.balance);
        const amount = input.amount ?? balance;
        if (balance > 0 && amount > balance) {
          conflict('Payment cannot exceed the remaining balance');
        }
        if (balance > 0) {
          repository.insertPayment(id, {
            amount,
            kind: 'final',
            mode: input.mode,
            paidOn: input.paidOn,
            note: null,
          });
        }
        const updated = getBooking(repository, id);
        const remainingBalance = Number(updated.balance);
        if (remainingBalance === 0) {
          repository.setCompleted(id, currentDateTime());
          reminders.removeAutoForBooking(id);
        }
        return {
          ...withPayments(repository, id),
          remainingBalance,
        };
      });
    },

    cancel(id: number, input: { refundAmount?: number; note?: string | null }) {
      return repository.transaction(() => {
        const booking = getBooking(repository, id);
        if (booking.status === 'cancelled' || booking.status === 'completed') {
          conflict('Completed or cancelled bookings cannot be cancelled');
        }
        const refundAmount = input.refundAmount ?? 0;
        if (refundAmount > Number(booking.paid_amount)) {
          conflict('Refund cannot exceed the amount paid');
        }
        if (refundAmount > 0) {
          repository.insertPayment(id, {
            amount: refundAmount,
            kind: 'refund',
            mode: 'other',
            paidOn: currentDate(),
            note: input.note ?? null,
          });
        }
        repository.setCancelled(id, currentDateTime());
        reminders.removeAutoForBooking(id);
        return withPayments(repository, id);
      });
    },
  };
}
