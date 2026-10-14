// The shortest a booking can be. Mirrors the server's own MIN_BOOKING_MINUTES
// in config.js: the server is what actually enforces this, this is only for
// building the list of durations to offer, and for marking a unit that
// cannot fit one in the booking grid.
export const MIN_BOOKING_MINUTES = 60;
