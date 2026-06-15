import { config } from '../config.js';

export function isBlockedDate(dateStr) {
  return config.rules.blockedDates.includes(dateStr);
}

export function todayISO() {
  return formatDateISO(new Date());
}

export function formatDateISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return formatDateISO(dt);
}

export function isJune2026(dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  return y === 2026 && m === 6;
}

export function monthKey(dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function isSunday(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay() === 0;
}

export function getBookableDates() {
  const dates = [];
  const minBookable = new Date();
  minBookable.setDate(minBookable.getDate() + 1);
  for (let i = 0; i < 90; i++) {
    const d = new Date(minBookable);
    d.setDate(minBookable.getDate() + i);
    const iso = formatDateISO(d);
    if (!isSunday(iso) && !isBlockedDate(iso)) dates.push(iso);
  }
  return dates;
}

export function padSeatId(id) {
  if (id === 'CONF') return 'CONF';
  return String(id).padStart(2, '0');
}

export function buildBarcodeRef(dateStr, seatId, code6) {
  const ymd = dateStr.replace(/-/g, '');
  return `EL-${ymd}-${padSeatId(seatId)}-${code6}`;
}

export function generateCode6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
