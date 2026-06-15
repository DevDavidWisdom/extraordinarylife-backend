import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';
import { getBlockedDateIds } from '../services/bookingRules.js';
import { isSunday } from '../utils/dates.js';

const router = Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

router.get('/', authMiddleware, async (_req, res) => {
  try {
    const dates = await getBlockedDateIds();
    res.json({ dates });
  } catch (err) {
    console.error('blocked-dates get', err);
    res.status(500).json({ error: 'Failed to load blocked dates' });
  }
});

router.post('/', authMiddleware, requireAdmin, async (req, res) => {
  const { date } = req.body;
  if (!DATE_RE.test(date)) {
    return res.status(400).json({ error: 'Invalid date. Use YYYY-MM-DD.' });
  }
  if (isSunday(date)) {
    return res.status(400).json({ error: 'Sundays are already closed for bookings.' });
  }

  try {
    await pool.query('INSERT INTO blocked_dates (date) VALUES ($1)', [date]);
    const dates = await getBlockedDateIds();
    res.status(201).json({ ok: true, dates });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'This date is already blocked.' });
    }
    console.error('blocked-dates post', err);
    res.status(500).json({ error: 'Failed to block date' });
  }
});

router.delete('/:date', authMiddleware, requireAdmin, async (req, res) => {
  const { date } = req.params;
  if (!DATE_RE.test(date)) {
    return res.status(400).json({ error: 'Invalid date.' });
  }

  try {
    await pool.query('DELETE FROM blocked_dates WHERE date = $1', [date]);
    const dates = await getBlockedDateIds();
    res.json({ ok: true, dates });
  } catch (err) {
    console.error('blocked-dates delete', err);
    res.status(500).json({ error: 'Failed to unblock date' });
  }
});

export default router;
