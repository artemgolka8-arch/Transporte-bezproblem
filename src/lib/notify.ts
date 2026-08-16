import { Resend } from "resend";
import twilio from "twilio";

let resendClient: Resend | null = null;
function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

export async function sendEmail(to: string, subject: string, text: string) {
  const client = getResend();
  if (!client) throw new Error("RESEND_API_KEY не настроен");

  const from = process.env.RESEND_FROM_EMAIL || "BezProblem <onboarding@resend.dev>";
  const { error } = await client.emails.send({ from, to, subject, text });
  if (error) throw new Error(error.message);
}

export async function sendSms(to: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) throw new Error("Twilio не настроен");

  const client = twilio(sid, token);
  await client.messages.create({ to, from, body });
}
