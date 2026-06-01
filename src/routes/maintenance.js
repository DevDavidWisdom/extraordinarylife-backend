import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';
import { getMaintenanceSeatIds } from '../services/bookingRules.js';

const router = Router();

router.get('/', authMiddleware, async (_req, res) => {
  try {
    const seats = await getMaintenanceSeatIds();
    res.json({ seats });
  } catch (err) {
    console.error('maintenance get', err);
    res.status(500).json({ error: 'Failed to load maintenance seats' });
  }
});

router.put('/', authMiddleware, requireAdmin, async (req, res) => {
  const { seats } = req.body;
  if (!Array.isArray(seats)) {
    return res.status(400).json({ error: 'seats array required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM maintenance_seats');
    for (const seatId of seats) {
      await client.query('INSERT INTO maintenance_seats (seat_id) VALUES ($1)', [seatId]);
    }
    await client.query('COMMIT');
    res.json({ ok: true, seats });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('maintenance put', err);
    res.status(500).json({ error: 'Failed to update maintenance seats' });
  } finally {
    client.release();
  }
});

export default router;
