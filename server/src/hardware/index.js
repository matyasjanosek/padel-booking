// The one place that chooses which hardware implementation is active. No
// real lighting or gate hardware exists yet, so this points at the
// simulation; a real implementation would export the same two functions
// from its own file and get swapped in here, with nothing else in the app
// needing to change.
export { scheduleLighting, openGate } from "./simulatedHardware.js";
