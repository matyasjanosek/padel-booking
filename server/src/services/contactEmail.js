import { getResend } from "../resendClient.js";
import { EMAIL_FROM_ADDRESS, CONTACT_RECIPIENT_ADDRESS } from "../config.js";

function buildMessageText({ name, email, message }) {
  return `New message from the contact form.

Name: ${name}
Email: ${email}

${message}`;
}

export async function sendContactMessage({ name, email, message }) {
  const resend = getResend();
  const { error } = await resend.emails.send({
    from: EMAIL_FROM_ADDRESS,
    to: CONTACT_RECIPIENT_ADDRESS,
    replyTo: email,
    subject: `Contact form message from ${name}`,
    text: buildMessageText({ name, email, message }),
  });

  if (error) {
    throw new Error(error.message);
  }
}
