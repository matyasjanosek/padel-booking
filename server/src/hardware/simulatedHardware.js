// No real lighting or gate hardware exists yet, see docs/plan.md. This
// implementation only stores what would have happened and logs it, so the
// booking and gate access flows can be built, tested and demonstrated
// without real hardware. A later real implementation would export the same
// functions from its own file, swapped in at hardware/index.js, with
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

// courtId and startTime together are the same key a booking's own slot is
// unique on, so they are enough to find the one schedule entry that belongs
// to a booking being rescheduled or cancelled. Does nothing if there is no
// matching entry, for example the booking was still pending and nothing
// was ever scheduled for it.
export function cancelLighting({ courtId, startTime }) {
  const index = lightingSchedules.findIndex(
    (schedule) =>
      schedule.courtId === courtId && schedule.startTime.getTime() === startTime.getTime(),
  );
  if (index === -1) {
    return;
  }
  lightingSchedules.splice(index, 1);
  console.log(`[hardware] lighting cancelled for court ${courtId}, ${startTime.toISOString()}`);
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
