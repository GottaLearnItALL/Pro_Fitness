import { useEffect } from 'react';

const EVENT = 'pf:booking_confirmed';

/** Fire from Chatbot when a successful booking reply is detected. */
export function emitBookingConfirmed() {
  window.dispatchEvent(new CustomEvent(EVENT));
}

/**
 * Drop this in any component that shows sessions.
 * `callback` should be a stable reference (useCallback) so the
 * effect doesn't re-subscribe on every render.
 */
export function useBookingRefresh(callback) {
  useEffect(() => {
    window.addEventListener(EVENT, callback);
    return () => window.removeEventListener(EVENT, callback);
  }, [callback]);
}
