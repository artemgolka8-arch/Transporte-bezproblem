"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { SMS_SENDERS, type SmsSender } from "@/lib/smsSenders";

type Channel = "EMAIL" | "SMS";

type MessageRecord = {
  id: string;
  channel: Channel;
  target: string;
  body: string;
  status: "SENT" | "FAILED";
  error: string | null;
  sentBy: string | null;
  createdAt: string;
};

const FIELD_CLASS =
  "w-full border-b border-line bg-transparent px-0 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-faint focus:border-cyan";

export function ClientNotifyPanel({
  clientId,
  firstName,
  hasEmail,
  hasPhone,
  history,
  editable,
}: {
  clientId: string;
  firstName: string;
  hasEmail: boolean;
  hasPhone: boolean;
  history: MessageRecord[];
  editable: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<Channel>(hasEmail ? "EMAIL" : "SMS");
  const [sender, setSender] = useState<SmsSender>("TEST");
  const [template, setTemplate] = useState<"reminder" | "return" | "custom">("reminder");
  const [message, setMessage] = useState(
    t("notify_template_reminder_body").replace("{name}", firstName)
  );
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [items, setItems] = useState(history);

  function applyTemplate(next: "reminder" | "return" | "custom") {
    setTemplate(next);
    if (next === "reminder") setMessage(t("notify_template_reminder_body").replace("{name}", firstName));
    else if (next === "return") setMessage(t("notify_template_return_body").replace("{name}", firstName));
    else setMessage("");
  }

  async function send() {
    if (!message.trim()) return;
    setSending(true);
    setError(null);
    setSent(false);
    const res = await fetch(`/api/clients/${clientId}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, message, sender: channel === "SMS" ? sender : undefined }),
    });
    setSending(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || t("notify_send_failed"));
      return;
    }
    setSent(true);
    setItems((prev) => [data, ...prev]);
  }

  const targetMissing = channel === "EMAIL" ? !hasEmail : !hasPhone;

  return (
    <div className="border-b border-line py-10">
      <div className="flex items-center justify-between">
        <div className="label-eyebrow">{t("notify_history_title")}</div>
        {editable && (
          <button
            onClick={() => setOpen((o) => !o)}
            className="text-sm text-cyan transition-colors hover:text-ink"
          >
            {open ? t("close") : t("notify_open_btn")}
          </button>
        )}
      </div>

      {open && editable && (
        <div className="mt-6 space-y-5">
          <div className="flex gap-5">
            {(["EMAIL", "SMS"] as Channel[]).map((c) => (
              <button
                key={c}
                onClick={() => setChannel(c)}
                disabled={c === "EMAIL" ? !hasEmail : !hasPhone}
                className={`text-sm transition-colors disabled:cursor-not-allowed disabled:text-faint/60 ${
                  channel === c ? "text-ink font-medium" : "text-muted hover:text-ink"
                }`}
              >
                {c === "EMAIL" ? t("notify_channel_email") : t("notify_channel_sms")}
              </button>
            ))}
          </div>

          {targetMissing ? (
            <div className="text-xs text-danger">
              {channel === "EMAIL" ? t("notify_no_email") : t("notify_no_phone")}
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1.5 block label-eyebrow">{t("notify_template_label")}</label>
                <select
                  value={template}
                  onChange={(e) => applyTemplate(e.target.value as "reminder" | "return" | "custom")}
                  className={FIELD_CLASS}
                >
                  <option value="reminder">{t("notify_template_reminder_title")}</option>
                  <option value="return">{t("notify_template_return_title")}</option>
                  <option value="custom">{t("notify_template_custom")}</option>
                </select>
              </div>

              {channel === "SMS" && (
                <div>
                  <label className="mb-1.5 block label-eyebrow">{t("notify_sender_label")}</label>
                  <select
                    value={sender}
                    onChange={(e) => setSender(e.target.value as SmsSender)}
                    className={FIELD_CLASS}
                  >
                    {SMS_SENDERS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1.5 block label-eyebrow">{t("notify_message_label")}</label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className={`${FIELD_CLASS} resize-none`}
                />
              </div>

              {error && <div className="text-xs text-danger">{error}</div>}
              {sent && !error && <div className="text-xs text-mint">{t("notify_sent_ok")}</div>}

              <div className="flex justify-end">
                <button
                  onClick={send}
                  disabled={sending || !message.trim()}
                  className="rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {sending ? t("notify_sending") : t("notify_send_btn")}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="mt-6">
        {items.length === 0 ? (
          <div className="text-sm text-muted">{t("notify_history_empty")}</div>
        ) : (
          <div className="divide-y divide-line">
            {items.map((m) => (
              <div key={m.id} className="py-3.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs uppercase tracking-wide text-faint">
                    {m.channel === "EMAIL" ? t("notify_channel_email") : t("notify_channel_sms")} · {m.target}
                  </span>
                  <span
                    className={`text-xs ${m.status === "SENT" ? "text-mint" : "text-danger"}`}
                  >
                    {m.status === "SENT" ? t("notify_status_sent") : t("notify_status_failed")}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink">{m.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
