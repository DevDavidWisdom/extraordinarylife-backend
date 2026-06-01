import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:3456')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean),
  admin: {
    email: (process.env.ADMIN_EMAIL || 'admin@extraordinarylife.ng').toLowerCase(),
    password: process.env.ADMIN_PASSWORD || 'admin123',
    fullName: process.env.ADMIN_NAME || 'Admin',
    phone: process.env.ADMIN_PHONE || '+234 800 000 0001',
    organisation: process.env.ADMIN_ORGANISATION || 'Extraordinary Life',
  },
  prices: {
    desk: 10000,
    conferenceHalf: 25000,
    conferenceFull: 45000,
  },
  rules: {
    minAdvanceDays: 1,
    calendarDays: 90,
    juneMaxDays: 10,
    conferenceMaxPerMonth: 1,
  },
};

export function isConference(seatId) {
  return seatId === 'CONF';
}
