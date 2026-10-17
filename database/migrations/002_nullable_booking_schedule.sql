PRAGMA defer_foreign_keys = ON;

CREATE TEMP TABLE bookings_payments_backup AS
SELECT id, booking_id, amount, kind, mode, paid_on, note FROM payments;

CREATE TEMP TABLE bookings_reminders_backup AS
SELECT id, title, remind_at, booking_id, ritual_id, done FROM reminders;

DROP VIEW booking_summary;

CREATE TABLE bookings_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  homam_type_id INTEGER NOT NULL REFERENCES homam_types(id),
  devotee_id INTEGER NOT NULL REFERENCES devotees(id),
  scheduled_at TEXT,
  location TEXT,
  total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
  status TEXT NOT NULL DEFAULT 'booked'
    CHECK (status IN ('booked', 'scheduled', 'completed', 'cancelled')),
  notes TEXT,
  completed_at TEXT,
  cancelled_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO bookings_new (
  id, homam_type_id, devotee_id, scheduled_at, location, total_amount,
  status, notes, completed_at, cancelled_at, created_at
)
SELECT
  id, homam_type_id, devotee_id, scheduled_at, location, total_amount,
  status, notes, completed_at, cancelled_at, created_at
FROM bookings;

DROP TABLE bookings;
ALTER TABLE bookings_new RENAME TO bookings;

INSERT INTO payments (id, booking_id, amount, kind, mode, paid_on, note)
SELECT id, booking_id, amount, kind, mode, paid_on, note
FROM bookings_payments_backup;

INSERT INTO reminders (id, title, remind_at, booking_id, ritual_id, done)
SELECT id, title, remind_at, booking_id, ritual_id, done
FROM bookings_reminders_backup;

DROP TABLE bookings_payments_backup;
DROP TABLE bookings_reminders_backup;

CREATE INDEX bookings_scheduled_at_idx ON bookings(scheduled_at);
CREATE INDEX bookings_status_idx ON bookings(status);

CREATE VIEW booking_summary AS
SELECT
  bookings.*,
  homam_types.name AS homam_name,
  devotees.name AS devotee_name,
  devotees.phone AS devotee_phone,
  COALESCE(payment_totals.paid_amount, 0) AS paid_amount,
  bookings.total_amount - COALESCE(payment_totals.paid_amount, 0) AS balance
FROM bookings
JOIN homam_types ON homam_types.id = bookings.homam_type_id
JOIN devotees ON devotees.id = bookings.devotee_id
LEFT JOIN (
  SELECT
    booking_id,
    SUM(CASE WHEN kind = 'refund' THEN -amount ELSE amount END) AS paid_amount
  FROM payments
  GROUP BY booking_id
) AS payment_totals ON payment_totals.booking_id = bookings.id;
