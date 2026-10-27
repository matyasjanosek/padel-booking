import { getResend } from "../resendClient.js";
import { PRAGUE_TIME_ZONE } from "../timezone.js";
import { EMAIL_FROM_ADDRESS } from "../config.js";
import { gateCodeWindow } from "./gateCode.js";

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

function buildEmailText(booking) {
  const { validFrom, validUntil } = gateCodeWindow(booking.startTime, booking.endTime);

  // A booking, and so the gate code window either side of it, can now
  // cross midnight, so only the time is shown when a date would be
  // redundant, and the gate code line never assumes a single day.
  const startDate = dateFormatter.format(booking.startTime);
  const endDate = dateFormatter.format(booking.endTime);
  const time =
    startDate === endDate
      ? `${timeFormatter.format(booking.startTime)} to ${timeFormatter.format(booking.endTime)}`
      : `${timeFormatter.format(booking.startTime)} on ${startDate} to ${timeFormatter.format(booking.endTime)} on ${endDate}`;

  const validFromDate = dateFormatter.format(validFrom);
  const validUntilDate = dateFormatter.format(validUntil);
  const gateWindow =
    validFromDate === validUntilDate
      ? `from ${timeFormatter.format(validFrom)} to ${timeFormatter.format(validUntil)} on the day of your booking`
      : `from ${timeFormatter.format(validFrom)} on ${validFromDate} to ${timeFormatter.format(validUntil)} on ${validUntilDate}`;

  return `Hi ${booking.user.name},

Your booking is confirmed.

Court: ${booking.court.name}
Date: ${startDate}
Time: ${time}
Price: ${Number(booking.price)} CZK

Gate code: ${booking.gateCode}
This code opens the gate from outside. You do not need a code to leave. It works ${gateWindow}, for everyone on the court.

See you on the court.
GEN PADEL Rožnov`;
}

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
