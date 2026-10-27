// The shortest and the longest a booking can be. Mirrors the server's own
// MIN_BOOKING_MINUTES and MAX_BOOKING_MINUTES in config.js: the server is
// what actually enforces these, this is only for building the list of
// lengths to offer.
export const MIN_BOOKING_MINUTES = 60;
export const MAX_BOOKING_MINUTES = 180;

// The grid shows one quarter of the day at a time, chosen from this tab
// row, so the page holds a handful of cells instead of all 48.
export const TIME_BANDS = [
  { key: "night", label: "Night", range: "00–06", startHour: 0, endHour: 6 },
  { key: "morning", label: "Morning", range: "06–12", startHour: 6, endHour: 12 },
  { key: "afternoon", label: "Afternoon", range: "12–18", startHour: 12, endHour: 18 },
  { key: "evening", label: "Evening", range: "18–24", startHour: 18, endHour: 24 },
];
