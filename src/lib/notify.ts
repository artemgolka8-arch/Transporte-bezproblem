import { SMS_SENDERS } from "@/lib/smsSenders";

// Brevo (ex-Sendinblue) — транзакционные письма через REST API.
// Документация: https://developers.brevo.com/reference/sendtransacemail
export async function sendEmail(to: string, subject: string, text: string) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error("BREVO_API_KEY не настроен");

  const fromEmail = process.env.BREVO_FROM_EMAIL;
  if (!fromEmail) throw new Error("BREVO_FROM_EMAIL не настроен");
  const fromName = process.env.BREVO_FROM_NAME || "BezProblem";

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: fromName, email: fromEmail },
      to: [{ email: to }],
      subject,
      textContent: text,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = data?.message || `Ошибка Brevo (HTTP ${res.status})`;
    throw new Error(msg);
  }
}

// SMSPlanet.pl — https://smsplanet.pl/doc/slate/index.html
export async function sendSms(to: string, body: string, sender?: string) {
  const token = process.env.SMSPLANET_API_TOKEN;
  const fallback = process.env.SMSPLANET_SENDER || "TEST";
  const from = sender && (SMS_SENDERS as readonly string[]).includes(sender) ? sender : fallback;
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
