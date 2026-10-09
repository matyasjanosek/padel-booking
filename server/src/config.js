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

// How many digits in a gate code, generated when a booking is confirmed.
export const GATE_CODE_DIGITS = 6;

// The gate code opens the gate from outside only, there is no code needed to
// leave. Its window is measured from the slot's start time, not its end, so
// it covers arriving a little early and running a little late. It has no
// usage limit inside that window, every player on the court lets themselves
// in separately.
export const GATE_CODE_VALID_BEFORE_MINUTES = 20;
export const GATE_CODE_VALID_AFTER_MINUTES = 45;

// Resend's own sandbox sender, used in development until a real domain is
// verified with Resend.
export const EMAIL_FROM_ADDRESS = "onboarding@resend.dev";

// Rate limiting for the public gate code validation endpoint, see
// middleware/rateLimitGate.js. The gate keypad is one physical device, so
// every real visitor shares its IP address, only failed attempts count
// against this, never a correct code. Strict enough that brute forcing a 6
// digit code within its whole 65 minute validity window (the two margins
// above) is not practical: a few dozen guesses at most against a million
// possible codes.
export const GATE_RATE_LIMIT_MAX_FAILURES = 5;
export const GATE_RATE_LIMIT_WINDOW_MINUTES = 15;
