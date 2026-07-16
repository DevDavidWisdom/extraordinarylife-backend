import { Router } from 'express';
import { pool } from '../db/pool.js';

const router = Router();

// Submit certification results
router.post('/', async (req, res) => {
  const { name, email, score, breakdown } = req.body;

  if (!name || !email || score === undefined || !breakdown) {
    return res.status(400).json({ error: 'Missing required fields: name, email, score, breakdown' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO certifications (full_name, email, score, breakdown)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, email, score, JSON.stringify(breakdown)]
    );

    res.status(201).json({ ok: true, certification: rows[0] });
  } catch (err) {
    console.error('Failed to save certification:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET all certifications
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM certifications ORDER BY created_at DESC');
    res.json({ certifications: rows });
  } catch (err) {
    console.error('Failed to fetch certifications:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
