import { getTimezone } from './auth';

/**
 * Format a date string using the user's stored timezone.
 * Falls back to the browser's local timezone if none is stored.
 */
export function fmtDate(dateStr, opts = { month: 'short', day: 'numeric' }) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { timeZone: getTimezone(), ...opts });
  } catch {
    return new Date(dateStr).toLocaleDateString('en-US', opts);
  }
}

export function fmtTime(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleTimeString('en-US', { timeZone: getTimezone(), hour: 'numeric', minute: '2-digit' });
  } catch {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
}

/**
 * Get the user's timezone string (e.g. "America/New_York").
 * Re-exported for components that need the raw value.
 */
export { getTimezone } from './auth';
