import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';
import { getTodayMetrics, getJuneQuotaList } from '../services/bookingRules.js';

const router = Router();

router.use(authMiddleware, requireAdmin);

router.get('/metrics', async (_req, res) => {
  try {
    const metrics = await getTodayMetrics();
    res.json({ metrics });
  } catch (err) {
    console.error('admin metrics', err);
    res.status(500).json({ error: 'Failed to load metrics' });
  }
});

router.get('/members', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT m.id, m.full_name, m.email, m.phone, m.organisation, m.photo,
              COUNT(b.id) FILTER (WHERE b.payment_status = 'paid')::int AS booking_count
       FROM members m
       LEFT JOIN bookings b ON b.user_id = m.id
       GROUP BY m.id
       ORDER BY m.full_name`
    );

    const members = rows.map((r) => ({
      id: r.id,
      fullName: r.full_name,
      email: r.email,
      phone: r.phone,
      organisation: r.organisation,
      photo: r.photo,
      bookingCount: r.booking_count,
    }));

    res.json({ members });
  } catch (err) {
    console.error('admin members', err);
    res.status(500).json({ error: 'Failed to load members' });
  }
});

router.get('/june-quota', async (_req, res) => {
  try {
    const quota = await getJuneQuotaList();
    res.json({ quota });
  } catch (err) {
    console.error('admin june-quota', err);
    res.status(500).json({ error: 'Failed to load June quota' });
  }
});

export default router;
