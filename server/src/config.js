// Bookable window, the same for every court. Hours are Europe/Prague wall
// clock time, see src/timezone.js. Both the opening and the closing hour
// depend on the day: the centre opens later and closes earlier at the
// weekend than on a weekday.
export const OPENING_HOUR_WEEKDAY = 7;
export const OPENING_HOUR_WEEKEND = 8;
export const CLOSING_HOUR_WEEKDAY = 22;
export const CLOSING_HOUR_WEEKEND = 20;

// Every booking is a whole number of these units, the court's own grid is
// drawn to this granularity too. A booking is at least two units long
// (MIN_BOOKING_MINUTES), and any whole number of units longer than that.
export const UNIT_LENGTH_MINUTES = 30;
export const MIN_BOOKING_MINUTES = 60;

// How long a pending booking holds its slot before it is free again, and the
// price for one hour of court time before any coupon discount. The price for
// a booking is this times its length in hours, computed on the server.
export const HOLD_MINUTES = 10;
export const PRICE_PER_HOUR_CZK = 400;

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

// Where a contact form message is sent, the same address the Contact page
// itself shows.
export const CONTACT_RECIPIENT_ADDRESS = "info@genpadel.cz";

// Rate limiting for the public contact form, see
// middleware/rateLimitContact.js. Every submission counts, not only failed
// ones, this is about limiting how much mail one visitor can trigger, not
// about guessing anything.
export const CONTACT_RATE_LIMIT_MAX_MESSAGES = 3;
export const CONTACT_RATE_LIMIT_WINDOW_MINUTES = 15;

// Rate limiting for the public gate code validation endpoint, see
// middleware/rateLimitGate.js. The gate keypad is one physical device, so
// every real visitor shares its IP address, only failed attempts count
// against this, never a correct code. Strict enough that brute forcing a 6
// digit code within its whole 65 minute validity window (the two margins
// above) is not practical: a few dozen guesses at most against a million
// possible codes.
export const GATE_RATE_LIMIT_MAX_FAILURES = 5;
export const GATE_RATE_LIMIT_WINDOW_MINUTES = 15;
