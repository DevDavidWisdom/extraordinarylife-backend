import { config, isConference } from '../config.js';
import { pool } from '../db/pool.js';
import {
  todayISO,
  addDays,
  isJune2026,
  monthKey,
  getBookableDates,
  isSunday,
} from '../utils/dates.js';
import { validateBookingTimes, pgTimeToStr } from '../utils/times.js';

function rowToBooking(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    seatId: row.seat_id,
    date: row.date instanceof Date ? row.date.toISOString().slice(0, 10) : row.date,
    sessionType: row.session_type,
    listPrice: row.list_price,
    amountPaid: row.amount_paid,
    amount: row.amount_paid,
    discountPercent: row.discount_percent,
    paymentStatus: row.payment_status,
    paymentRef: row.payment_ref,
    accessCode: row.access_code,
    barcodeRef: row.barcode_ref,
    checkedIn: row.checked_in,
    checkedInAt: row.checked_in_at ? new Date(row.checked_in_at).getTime() : null,
    createdAt: new Date(row.created_at).getTime(),
    paidAt: new Date(row.paid_at).getTime(),
    startTime: pgTimeToStr(row.start_time) || '09:00',
    endTime: pgTimeToStr(row.end_time) || '17:00',
  };
}

export async function getAllBookingsRows() {
  const { rows } = await pool.query(
    `SELECT * FROM bookings WHERE payment_status = 'paid' ORDER BY created_at DESC`
  );
  return rows.map(rowToBooking);
}

export async function getMaintenanceSeatIds() {
  const { rows } = await pool.query('SELECT seat_id FROM maintenance_seats');
  return rows.map((r) => r.seat_id);
}

async function getSeatBookingOnDate(seatId, dateStr) {
  const { rows } = await pool.query(
    `SELECT * FROM bookings WHERE seat_id = $1 AND date = $2 AND payment_status = 'paid' LIMIT 1`,
    [seatId, dateStr]
  );
  return rowToBooking(rows[0]);
}

async function countUserJuneBookings(userId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS c FROM bookings
     WHERE user_id = $1 AND EXTRACT(YEAR FROM date) = 2026 AND EXTRACT(MONTH FROM date) = 6
     AND seat_id != 'CONF' AND payment_status = 'paid'`,
    [userId]
  );
  return rows[0].c;
}

async function countUserConferenceInMonth(userId, dateStr) {
  const mk = monthKey(dateStr);
  const [y, m] = mk.split('-').map(Number);
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS c FROM bookings
     WHERE user_id = $1 AND seat_id = 'CONF' AND payment_status = 'paid'
     AND EXTRACT(YEAR FROM date) = $2 AND EXTRACT(MONTH FROM date) = $3`,
    [userId, y, m]
  );
  return rows[0].c;
}

export async function getBlockedDateIds() {
  const { rows } = await pool.query(
    'SELECT date::text AS date FROM blocked_dates ORDER BY date'
  );
  return rows.map((r) => r.date.slice(0, 10));
}

export async function getBookableDatesForApi() {
  const blocked = await getBlockedDateIds();
  return getBookableDates(blocked);
}

export function calculatePrice(seatId, sessionType) {
  if (isConference(seatId)) {
    return sessionType === 'full' ? config.prices.conferenceFull : config.prices.conferenceHalf;
  }
  return config.prices.desk;
}

export async function validateBooking(
  userId,
  seatId,
  dateStr,
  sessionType = null,
  startTime = null,
  endTime = null
) {
  const errors = [];
  errors.push(...validateBookingTimes(startTime, endTime));

  const minDate = addDays(todayISO(), config.rules.minAdvanceDays);
  if (dateStr < minDate) {
    errors.push('Bookings must be made at least 1 day in advance.');
  }

  const bookable = await getBookableDatesForApi();
  const blocked = await getBlockedDateIds();
  if (isSunday(dateStr)) {
    errors.push('Bookings are not available on Sundays.');
  } else if (blocked.includes(dateStr)) {
    errors.push('This date is not available for booking.');
  } else if (!bookable.includes(dateStr)) {
    errors.push('Selected date is outside the 90-day booking window.');
  }

  const maintenance = await getMaintenanceSeatIds();
  if (maintenance.includes(seatId)) {
    errors.push('This seat is unavailable for maintenance.');
  }

  const existingSeat = await getSeatBookingOnDate(seatId, dateStr);
  if (existingSeat) {
    errors.push('This seat is already booked for the selected date.');
  }

  if (!isConference(seatId)) {
    const { rows } = await pool.query(
      `SELECT id FROM bookings WHERE user_id = $1 AND date = $2 AND seat_id != 'CONF' AND payment_status = 'paid' LIMIT 1`,
      [userId, dateStr]
    );
    if (rows.length) {
      errors.push('You already have a desk booking on this date (one seat per day).');
    }

    if (isJune2026(dateStr)) {
      const juneCount = await countUserJuneBookings(userId);
      if (juneCount >= config.rules.juneMaxDays) {
        errors.push(
          `June 2026 limit reached: you have used all ${config.rules.juneMaxDays} allowed booking days.`
        );
      }
    }
  } else {
    if ((await countUserConferenceInMonth(userId, dateStr)) >= config.rules.conferenceMaxPerMonth) {
      errors.push('Conference room limit: maximum 1 booking per calendar month.');
    }
    const confBooked = await getSeatBookingOnDate('CONF', dateStr);
    if (confBooked && sessionType) {
      if (confBooked.sessionType === 'full' || sessionType === 'full') {
        errors.push('Conference room is not available for the selected session.');
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

export async function getSeatStatuses(dateStr, userId) {
  const maintenance = await getMaintenanceSeatIds();
  const { rows } = await pool.query(
    `SELECT seat_id, user_id FROM bookings WHERE date = $1 AND payment_status = 'paid'`,
    [dateStr]
  );
  const bySeat = Object.fromEntries(rows.map((r) => [r.seat_id, r.user_id]));

  return (seatId) => {
    if (maintenance.includes(seatId)) return 'maintenance';
    const uid = bySeat[seatId];
    if (uid) return uid === userId ? 'yours' : 'booked';
    return 'available';
  };
}

export async function getTodayMetrics() {
  const today = todayISO();
  const { rows } = await pool.query(
    `SELECT * FROM bookings WHERE date = $1 AND payment_status = 'paid'`,
    [today]
  );
  const bookings = rows.map(rowToBooking);
  const revenue = bookings.reduce((s, b) => s + (b.amountPaid ?? 0), 0);
  const checkIns = bookings.filter((b) => b.checkedIn).length;
  const deskBooked = bookings.filter((b) => !isConference(b.seatId)).length;

  return {
    bookingsToday: bookings.length,
    revenue,
    availableSeats: Math.max(0, 17 - deskBooked),
    checkIns,
  };
}

export async function getJuneQuotaList() {
  const { rows: members } = await pool.query('SELECT id, full_name FROM members ORDER BY full_name');
  const list = [];
  for (const m of members) {
    const used = await countUserJuneBookings(m.id);
    list.push({
      userId: m.id,
      name: m.full_name,
      used,
      max: config.rules.juneMaxDays,
    });
  }
  return list.sort((a, b) => b.used - a.used);
}

export { rowToBooking };
