import { getResend } from "../resendClient.js";
import { PRAGUE_TIME_ZONE } from "../timezone.js";
import {
  GATE_CODE_VALID_BEFORE_MINUTES,
  GATE_CODE_VALID_AFTER_MINUTES,
  EMAIL_FROM_ADDRESS,
} from "../config.js";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: PRAGUE_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: PRAGUE_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// The gate code's window is measured from the slot's start time, not its
// end, see config.js.
function gateCodeWindow(startTime) {
  const validFrom = new Date(startTime.getTime() - GATE_CODE_VALID_BEFORE_MINUTES * 60 * 1000);
  const validUntil = new Date(startTime.getTime() + GATE_CODE_VALID_AFTER_MINUTES * 60 * 1000);
  return { validFrom, validUntil };
}

function buildEmailText(booking) {
  const { validFrom, validUntil } = gateCodeWindow(booking.startTime);

  return `Hi ${booking.user.name},

Your booking is confirmed.

Court: ${booking.court.name}
Date: ${dateFormatter.format(booking.startTime)}
Time: ${timeFormatter.format(booking.startTime)} to ${timeFormatter.format(booking.endTime)}
Price: ${Number(booking.price)} CZK

Gate code: ${booking.gateCode}
This code opens the gate from outside. You do not need a code to leave. It works from ${timeFormatter.format(validFrom)} to ${timeFormatter.format(validUntil)} on the day of your booking, for everyone on the court.

See you on the court.
GEN PADEL Rožnov`;
}

// booking must already carry its user and court. Throws on failure, so the
// caller decides what a failed email should mean, see stripeWebhook.js.
export async function sendBookingConfirmationEmail(booking) {
  const resend = getResend();
  const { error } = await resend.emails.send({
    from: EMAIL_FROM_ADDRESS,
    to: booking.user.email,
    subject: "Your court is booked, GEN PADEL Rožnov",
    text: buildEmailText(booking),
  });

  if (error) {
    throw new Error(error.message);
  }
}
