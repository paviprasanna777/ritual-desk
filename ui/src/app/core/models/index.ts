export type PaymentMode = 'cash' | 'upi' | 'other';
export type PaymentKind = 'advance' | 'part' | 'final' | 'refund';
export type BookingStatus = 'booked' | 'scheduled' | 'completed' | 'cancelled';
export type RitualTypeKind = 'daily' | 'weekly' | 'monthly' | 'festival' | 'special';

export interface HomamType {
  id: number;
  name: string;
  defaultAmount: number;
  durationMins: number | null;
  itemsNeeded: string[];
  notes: string | null;
  active: number;
}

export interface HomamTypeInput {
  name: string;
  defaultAmount: number;
  durationMins: number | null;
  itemsNeeded: string[];
  notes: string | null;
}

export interface Devotee {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
}

export interface DevoteeInput {
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
}

export interface DevoteeDetail extends Devotee {
  bookings: BookingSummary[];
  totalBalanceDue: number;
}

export interface Payment {
  id: number;
  bookingId: number;
  amount: number;
  kind: PaymentKind;
  mode: PaymentMode;
  paidOn: string;
  note: string | null;
}

export interface Booking {
  id: number;
  homamTypeId: number;
  homamName: string;
  devoteeId: number;
  devoteeName: string;
  scheduledAt: string | null;
  location: string | null;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: BookingStatus;
  notes: string | null;
  payments: Payment[];
  completedAt: string | null;
  cancelledAt: string | null;
}

export interface BookingCompleteResult extends Booking {
  remainingBalance: number;
}

export type BookingSummary = Omit<Booking, 'payments'> & {
  payments?: Payment[];
};

export interface BookingFilters {
  status?: BookingStatus;
  from?: string;
  to?: string;
  devoteeId?: number;
  balanceDue?: boolean;
}

export interface BookingCreateInput {
  homamTypeId: number;
  devoteeId: number;
  scheduledAt?: string | null;
  location?: string | null;
  totalAmount?: number;
  advanceAmount?: number;
  advanceMode?: PaymentMode;
  notes?: string | null;
}

export interface BookingUpdateInput {
  homamTypeId?: number;
  devoteeId?: number;
  scheduledAt?: string | null;
  location?: string | null;
  totalAmount?: number;
  notes?: string | null;
}

export interface PaymentInput {
  amount: number;
  kind: PaymentKind;
  mode: PaymentMode;
  paidOn: string;
  note?: string | null;
}

export interface BookingCompleteInput {
  mode: PaymentMode;
  paidOn: string;
  amount?: number;
}

export interface BookingCancelInput {
  refundAmount?: number;
  note?: string | null;
}

export interface Ritual {
  id: number;
  title: string;
  type: RitualTypeKind;
  time: string | null;
  daysOfWeek: string | null;
  dayOfMonth: number | null;
  date: string | null;
  notes: string | null;
  active: number;
}

export interface RitualInput {
  title: string;
  type: RitualTypeKind;
  time: string | null;
  daysOfWeek: string | null;
  dayOfMonth: number | null;
  date: string | null;
  notes: string | null;
  active?: number;
}

export interface Reminder {
  id: number;
  title: string;
  remindAt: string;
  bookingId: number | null;
  ritualId: number | null;
  done: boolean | 0 | 1;
  autoCreated?: boolean | 0 | 1;
}

export interface ReminderInput {
  title: string;
  remindAt: string;
  bookingId: number | null;
  ritualId: number | null;
  done: boolean;
}

export interface ScheduleBookingItem {
  type: 'booking';
  id: number;
  title: string;
  time: string;
  status: BookingStatus;
}

export interface ScheduleRitualItem {
  type: 'ritual';
  id: number;
  title: string;
  time: string;
  status: 'done' | 'pending';
  done: boolean;
}

export type ScheduleItem = ScheduleBookingItem | ScheduleRitualItem;

export interface DashboardSummary {
  todayCount: number;
  doneToday: number;
  balanceToCollect: number;
  next7DaysCount: number;
  todaysItems: ScheduleItem[];
  upcoming: BookingSummary[];
  balanceDue: BookingSummary[];
  todaysReminders: Reminder[];
}

export interface HistoryTotals {
  totalCharged: number;
  totalCollected: number;
  totalDue: number;
}

export interface HistorySummary {
  items: BookingSummary[];
  totals: HistoryTotals;
}

export interface AuthUser {
  id: number;
  username: string;
  name: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}
