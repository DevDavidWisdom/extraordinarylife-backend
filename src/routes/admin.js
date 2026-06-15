import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';
import {
  getTodayMetrics,
  getAllBookingsRows,
  countAllBookings,
  getJuneQuotaPage,
  countJuneQuotaMembers,
} from '../services/bookingRules.js';

const router = Router();

router.use(authMiddleware, requireAdmin);

const PAGE_LIMIT = 20;
const MEMBERS_LIMIT = 12;
const QUOTA_LIMIT = 15;

function parsePage(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || PAGE_LIMIT));
  return { page, limit, offset: (page - 1) * limit };
}

router.get('/metrics', async (_req, res) => {
  try {
    const metrics = await getTodayMetrics();
    res.json({ metrics });
  } catch (err) {
    console.error('admin metrics', err);
    res.status(500).json({ error: 'Failed to load metrics' });
  }
});

router.get('/bookings', async (req, res) => {
  try {
    const { page, limit, offset } = parsePage(req.query);
    const [bookings, total] = await Promise.all([
      getAllBookingsRows(limit, offset),
      countAllBookings(),
    ]);
    res.json({
      bookings,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    console.error('admin bookings', err);
    res.status(500).json({ error: 'Failed to load bookings' });
  }
});

router.get('/members/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT m.id, m.full_name, m.email, m.phone, m.organisation, m.photo, m.created_at,
              COUNT(b.id) FILTER (WHERE b.payment_status = 'paid')::int AS booking_count
       FROM members m
       LEFT JOIN bookings b ON b.user_id = m.id
       WHERE m.id = $1
       GROUP BY m.id`,
      [req.params.id]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'Member not found' });
    }
    const r = rows[0];
    res.json({
      member: {
        id: r.id,
        fullName: r.full_name,
        email: r.email,
        phone: r.phone,
        organisation: r.organisation,
        photo: r.photo,
        bookingCount: r.booking_count,
        createdAt: new Date(r.created_at).getTime(),
      },
    });
  } catch (err) {
    console.error('admin member get', err);
    res.status(500).json({ error: 'Failed to load member' });
  }
});

router.get('/members', async (req, res) => {
  try {
    const { page, limit, offset } = parsePage(req.query);
    const memberLimit = Math.min(50, parseInt(req.query.limit, 10) || MEMBERS_LIMIT);
    const memberOffset = (page - 1) * memberLimit;

    const [countRes, listRes] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS c FROM members'),
      pool.query(
        `SELECT m.id, m.full_name, m.email, m.phone, m.organisation,
                COUNT(b.id) FILTER (WHERE b.payment_status = 'paid')::int AS booking_count
         FROM members m
         LEFT JOIN bookings b ON b.user_id = m.id
         GROUP BY m.id
         ORDER BY m.full_name
         LIMIT $1 OFFSET $2`,
        [memberLimit, memberOffset]
      ),
    ]);

    const total = countRes.rows[0].c;
    const members = listRes.rows.map((r) => ({
      id: r.id,
      fullName: r.full_name,
      email: r.email,
      phone: r.phone,
      organisation: r.organisation,
      bookingCount: r.booking_count,
    }));

    res.json({
      members,
      page,
      limit: memberLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / memberLimit)),
    });
  } catch (err) {
    console.error('admin members', err);
    res.status(500).json({ error: 'Failed to load members' });
  }
});

router.get('/june-quota', async (req, res) => {
  try {
    const { page, limit, offset } = parsePage(req.query);
    const quotaLimit = Math.min(50, parseInt(req.query.limit, 10) || QUOTA_LIMIT);
    const quotaOffset = (page - 1) * quotaLimit;

    const [quota, total] = await Promise.all([
      getJuneQuotaPage(quotaLimit, quotaOffset),
      countJuneQuotaMembers(),
    ]);

    res.json({
      quota,
      page,
      limit: quotaLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / quotaLimit)),
    });
  } catch (err) {
    console.error('admin june-quota', err);
    res.status(500).json({ error: 'Failed to load June quota' });
  }
});

export default router;
