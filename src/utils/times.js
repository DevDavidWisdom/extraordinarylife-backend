import { config } from '../config.js';

const { open, close } = config.venueHours;

export function getHourlyTimeSlots() {
  const slots = [];
  const [openH] = open.split(':').map(Number);
  const [closeH] = close.split(':').map(Number);
  for (let h = openH; h <= closeH; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
  }
  return slots;
}

export function normalizeTime(value) {
  if (!value) return null;
  const str = String(value).slice(0, 5);
  return /^\d{2}:\d{2}$/.test(str) ? str : null;
}

export function validateBookingTimes(startTime, endTime) {
  const errors = [];
  const start = normalizeTime(startTime);
  const end = normalizeTime(endTime);

  if (!start || !end) {
    errors.push('Please select a valid start and end time.');
    return errors;
  }

  const slots = new Set(getHourlyTimeSlots());
  if (!slots.has(start) || !slots.has(end)) {
    errors.push('Times must be on the hour within opening hours.');
  }
  if (start >= end) {
    errors.push('End time must be after start time.');
  }
  if (start < open || end > close) {
    errors.push(`Bookings are available ${open} – ${close} only.`);
  }
  return errors;
}

export function pgTimeToStr(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 5);
  return String(value).slice(0, 5);
}
