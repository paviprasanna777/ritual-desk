ALTER TABLE reminders
ADD COLUMN auto_created INTEGER NOT NULL DEFAULT 0
CHECK (auto_created IN (0, 1));

CREATE INDEX reminders_booking_auto_idx
ON reminders(booking_id, auto_created);
