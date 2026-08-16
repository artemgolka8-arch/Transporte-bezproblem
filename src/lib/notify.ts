import { Resend } from "resend";

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

// SMSPlanet.pl — https://smsplanet.pl/doc/slate/index.html
export async function sendSms(to: string, body: string) {
  const token = process.env.SMSPLANET_API_TOKEN;
  const from = process.env.SMSPLANET_SENDER || "TEST";
  if (!token) throw new Error("SMSPLANET_API_TOKEN не настроен");

  const params = new URLSearchParams();
  params.set("from", from);
  params.set("to", to);
  params.set("msg", body);

  const res = await fetch("https://api2.smsplanet.pl/sms", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = (await res.json()) as
    | { messageId: string }
    | { errorMsg: string; errorCode: number };

  if (!res.ok || "errorMsg" in data) {
    const msg = "errorMsg" in data ? data.errorMsg : `Ошибка SMSPlanet (HTTP ${res.status})`;
    throw new Error(msg);
  }
}
