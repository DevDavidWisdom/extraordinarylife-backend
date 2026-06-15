import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { authMiddleware } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import bookingsRoutes from './routes/bookings.js';
import adminRoutes from './routes/admin.js';
import maintenanceRoutes from './routes/maintenance.js';
import blockedDatesRoutes from './routes/blockedDates.js';

const app = express();

app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'extraordinarylife-api' });
});

app.use('/api/auth', authRoutes);

app.get('/api/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

app.use('/api/bookings', bookingsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/blocked-dates', blockedDatesRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.port, () => {
  console.log(`Extraordinary Life API listening on http://localhost:${config.port}`);
});
