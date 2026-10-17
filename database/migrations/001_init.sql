CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE homam_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  default_amount INTEGER NOT NULL DEFAULT 0,
  duration_mins INTEGER,
  items_needed TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE devotees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bookings (
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

CREATE INDEX bookings_scheduled_at_idx ON bookings(scheduled_at);
CREATE INDEX bookings_status_idx ON bookings(status);

CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  kind TEXT NOT NULL CHECK (kind IN ('advance', 'part', 'final', 'refund')),
  mode TEXT NOT NULL CHECK (mode IN ('cash', 'upi', 'other')),
  paid_on TEXT NOT NULL,
  note TEXT
);

CREATE TABLE rituals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('daily', 'weekly', 'monthly', 'festival', 'special')),
  time TEXT,
  days_of_week TEXT,
  day_of_month INTEGER,
  date TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  notes TEXT
);

CREATE TABLE ritual_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ritual_id INTEGER NOT NULL REFERENCES rituals(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  done_at TEXT,
  UNIQUE (ritual_id, date)
);

CREATE TABLE reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  remind_at TEXT NOT NULL,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  ritual_id INTEGER REFERENCES rituals(id) ON DELETE CASCADE,
  done INTEGER NOT NULL DEFAULT 0
);

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
