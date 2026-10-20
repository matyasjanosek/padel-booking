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
