import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { pool } from '../db/pool.js';

function memberToUser(row) {
  return {
    id: row.id,
    role: 'member',
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    organisation: row.organisation,
    photo: row.photo,
    consentGiven: row.consent_given,
    termsAcceptedAt: new Date(row.terms_accepted_at).getTime(),
    createdAt: new Date(row.created_at).getTime(),
  };
}

function adminUser() {
  return {
    id: 'admin',
    role: 'admin',
    fullName: config.admin.fullName,
    email: config.admin.email,
    phone: config.admin.phone,
    organisation: config.admin.organisation,
    photo: null,
    consentGiven: true,
    termsAcceptedAt: Date.now(),
    createdAt: Date.now(),
  };
}

export function signToken(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

export async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(header.slice(7), config.jwtSecret);
    if (decoded.role === 'admin') {
      if (decoded.email !== config.admin.email) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      req.user = adminUser();
      return next();
    }

    const { rows } = await pool.query('SELECT * FROM members WHERE id = $1', [decoded.sub]);
    if (!rows[0]) return res.status(401).json({ error: 'User not found' });
    req.user = memberToUser(rows[0]);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

export { memberToUser, adminUser };
