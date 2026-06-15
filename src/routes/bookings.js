import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';
import {
  validateBooking,
  calculatePrice,
  getSeatStatuses,
  rowToBooking,
} from '../services/bookingRules.js';
import { buildBarcodeRef, generateCode6 } from '../utils/dates.js';
import { getBookableDatesForApi } from '../services/bookingRules.js';
import { isConference } from '../config.js';

const router = Router();

router.use(authMiddleware);

router.get('/dates', async (_req, res) => {
  try {
    const dates = await getBookableDatesForApi();
    res.json({ dates });
  } catch (err) {
    console.error('bookable dates', err);
    res.status(500).json({ error: 'Failed to load bookable dates' });
  }
});

router.get('/', async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.json({ bookings: [] });
    }
    const { rows } = await pool.query(
      `SELECT * FROM bookings WHERE user_id = $1 AND payment_status = 'paid' ORDER BY date DESC`,
      [req.user.id]
    );
    res.json({ bookings: rows.map(rowToBooking) });
  } catch (err) {
    console.error('list bookings', err);
    res.status(500).json({ error: 'Failed to load bookings' });
  }
});

router.get('/availability', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'date query required' });
    const statusFor = await getSeatStatuses(date, req.user.id);
    const statuses = {};
    const seatIds = [
      '17', '16', '15', '14', '13', '12', '10', '11',
      '05', '02', '04', '01', '03', '07', '09', '06', '08', 'CONF',
    ];
    for (const id of seatIds) {
      statuses[id] = statusFor(id);
    }
    res.json({ date, statuses });
  } catch (err) {
    console.error('availability', err);
    res.status(500).json({ error: 'Failed to load availability' });
  }
});

router.post('/', async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Admins cannot create member bookings' });
    }

    const {
      seatId,
      date,
      sessionType = 'half',
      startTime = '09:00',
      endTime = '17:00',
      termsAccepted,
    } = req.body;
    if (!termsAccepted) {
      return res.status(400).json({ error: 'You must accept the Terms & Conditions.' });
    }

    const validation = await validateBooking(
      req.user.id,
      seatId,
      date,
      sessionType,
      startTime,
      endTime
    );
    if (!validation.ok) {
      return res.status(400).json({ error: validation.errors[0], errors: validation.errors });
    }

    const listPrice = calculatePrice(seatId, sessionType);
    const accessCode = generateCode6();
    const barcodeRef = buildBarcodeRef(date, seatId, accessCode);
    const paymentRef = `EL-FREE-${Date.now()}`;

    const { rows } = await pool.query(
      `INSERT INTO bookings (
        user_id, seat_id, date, session_type, list_price, amount_paid, discount_percent,
        payment_status, payment_ref, access_code, barcode_ref, start_time, end_time
      ) VALUES ($1, $2, $3, $4, $5, 0, 100, 'paid', $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        req.user.id,
        seatId,
        date,
        isConference(seatId) ? sessionType : 'full',
        listPrice,
        paymentRef,
        accessCode,
        barcodeRef,
        startTime,
        endTime,
      ]
    );

    res.status(201).json({ ok: true, booking: rowToBooking(rows[0]) });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'This seat is already booked for the selected date.' });
    }
    console.error('create booking', err);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

router.get('/lookup', async (req, res) => {
  try {
    const { barcodeRef } = req.query;
    if (!barcodeRef) return res.status(400).json({ error: 'barcodeRef required' });

    const { rows } = await pool.query('SELECT * FROM bookings WHERE barcode_ref = $1', [
      barcodeRef,
    ]);
    if (!rows[0]) return res.status(404).json({ error: 'Booking not found' });

    const booking = rowToBooking(rows[0]);
    let member = null;
    if (booking.userId) {
      const m = await pool.query('SELECT * FROM members WHERE id = $1', [booking.userId]);
      if (m.rows[0]) {
        member = {
          id: m.rows[0].id,
          fullName: m.rows[0].full_name,
          email: m.rows[0].email,
          phone: m.rows[0].phone,
          photo: m.rows[0].photo,
        };
      }
    }

    res.json({ booking, member });
  } catch (err) {
    console.error('lookup', err);
    res.status(500).json({ error: 'Lookup failed' });
  }
});

router.patch('/:id/check-in', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE bookings SET checked_in = true, checked_in_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Booking not found' });
    res.json({ ok: true, booking: rowToBooking(rows[0]) });
  } catch (err) {
    console.error('check-in', err);
    res.status(500).json({ error: 'Check-in failed' });
  }
});

export default router;
