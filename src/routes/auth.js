import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { config } from '../config.js';
import { signToken, memberToUser, adminUser } from '../middleware/auth.js';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { fullName, email, phone, organisation, password, photo, consent, termsAccepted } =
      req.body;

    if (!consent) return res.status(400).json({ error: 'You must consent to personal data use.' });
    if (!termsAccepted) {
      return res.status(400).json({ error: 'You must accept the Terms & Conditions.' });
    }
    if (!fullName || !email || !phone || !organisation || !password) {
      return res.status(400).json({ error: 'All required fields must be provided.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail === config.admin.email) {
      return res.status(400).json({ error: 'This email cannot be used for registration.' });
    }

    const existing = await pool.query('SELECT id FROM members WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO members (full_name, email, phone, organisation, password_hash, photo)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        fullName.trim(),
        normalizedEmail,
        phone.trim(),
        organisation.trim(),
        passwordHash,
        photo || null,
      ]
    );

    const user = memberToUser(rows[0]);
    const token = signToken({ sub: user.id, role: 'member' });
    res.status(201).json({ ok: true, user, token });
  } catch (err) {
    console.error('register', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedEmail === config.admin.email) {
      if (password !== config.admin.password) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
      const user = adminUser();
      const token = signToken({ role: 'admin', email: config.admin.email });
      return res.json({ ok: true, user, token });
    }

    const { rows } = await pool.query('SELECT * FROM members WHERE email = $1', [normalizedEmail]);
    const member = rows[0];
    if (!member) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = await bcrypt.compare(password, member.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = memberToUser(member);
    const token = signToken({ sub: user.id, role: 'member' });
    res.json({ ok: true, user, token });
  } catch (err) {
    console.error('login', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
