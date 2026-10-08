// Bookable window and slot length, the same for every court and every day.
// Hours are Europe/Prague wall clock time, see src/timezone.js.
export const SLOT_LENGTH_MINUTES = 60;
export const OPENING_HOUR = 7;
export const CLOSING_HOUR = 22;

// How long a pending booking holds its slot before it is free again, and the
// price for one slot. One price for every slot for now, no coupons yet.
export const HOLD_MINUTES = 10;
export const PRICE_PER_SLOT_CZK = 400;

// How often the background job sweeps for pending bookings whose hold has
// passed and marks them expired.
export const HOLD_EXPIRY_INTERVAL_SECONDS = 60;
