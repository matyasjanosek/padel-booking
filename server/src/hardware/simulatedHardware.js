// No real lighting or gate hardware exists yet, see docs/plan.md. This
// implementation only stores what would have happened and logs it, so the
// booking and gate access flows can be built, tested and demonstrated
// without real hardware. A later real implementation would export the same
// two functions from its own file, swapped in at hardware/index.js, with
// nothing else in the app needing to change.
const lightingSchedules = [];
const gateEvents = [];

export function scheduleLighting({ courtId, startTime, endTime }) {
  const schedule = { courtId, startTime, endTime, scheduledAt: new Date() };
  lightingSchedules.push(schedule);
  console.log(
    `[hardware] lighting scheduled for court ${courtId}, ${startTime.toISOString()} to ${endTime.toISOString()}`,
  );
  return schedule;
}

export function openGate({ bookingId }) {
  const event = { bookingId, openedAt: new Date() };
  gateEvents.push(event);
  console.log(`[hardware] gate opened for booking ${bookingId}`);
  return event;
}

export function getLightingSchedules() {
  return lightingSchedules;
}

export function getGateEvents() {
  return gateEvents;
}
