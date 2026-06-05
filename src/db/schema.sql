CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  organisation TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  photo TEXT,
  consent_given BOOLEAN NOT NULL DEFAULT true,
  terms_accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  seat_id TEXT NOT NULL,
  date DATE NOT NULL,
  session_type TEXT NOT NULL DEFAULT 'full',
  list_price INTEGER NOT NULL,
  amount_paid INTEGER NOT NULL DEFAULT 0,
  discount_percent INTEGER NOT NULL DEFAULT 100,
  payment_status TEXT NOT NULL DEFAULT 'paid',
  payment_ref TEXT,
  access_code CHAR(6) NOT NULL,
  barcode_ref TEXT NOT NULL UNIQUE,
  checked_in BOOLEAN NOT NULL DEFAULT false,
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '17:00'
);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS start_time TIME NOT NULL DEFAULT '09:00';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS end_time TIME NOT NULL DEFAULT '17:00';

CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_seat_date ON bookings(seat_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_barcode ON bookings(barcode_ref);

CREATE TABLE IF NOT EXISTS maintenance_seats (
  seat_id TEXT PRIMARY KEY,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
