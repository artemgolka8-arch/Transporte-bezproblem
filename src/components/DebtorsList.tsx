"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { canEdit, Role } from "@/lib/roles";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

type DebtorMessage = {
  id: string;
  target: string;
  body: string;
  status: string;
  error: string | null;
  sentBy: string | null;
  createdAt: string;
};

type DebtorRow = {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  vehicleName: string | null;
  organisation: string | null;
  currentBalance: number;
  balanceWithDeposits: number | null;
  dateOfLastUnpaidPayoff: string | null;
  debtNotes: string | null;
  isContactedForDebt: boolean;
  lastSyncedAt: string;
  messages: DebtorMessage[];
};

function formatMoney(value: number) {
  return `${value.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} zł`;
}

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "?";
}

const AVATAR_PALETTE = [
  { bg: "bg-mintDim/70", text: "text-mint" },
  { bg: "bg-cyanDim/70", text: "text-cyan" },
  { bg: "bg-violetDim/70", text: "text-violet" },
  { bg: "bg-amberDim/70", text: "text-amber" },
];

function avatarStyle(seed: string) {
  const code = seed.charCodeAt(0) || 0;
  return AVATAR_PALETTE[code % AVATAR_PALETTE.length];
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 4.5c.3 3.9 1.9 7.5 4.7 10.3 2.8 2.8 6.4 4.4 10.3 4.7l.6-3.4-4-1.6-1.6 1.8a13 13 0 0 1-6.4-6.4l1.8-1.6-1.6-4Z" />
    </svg>
  );
}

function RefreshIcon({ spinning }: { spinning?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={spinning ? "animate-spin" : ""}
    >
      <path d="M20 11A8 8 0 0 0 6.3 6.3L4 8.5" />
      <path d="M4 4v4.5h4.5" />
      <path d="M4 13a8 8 0 0 0 13.7 4.7L20 15.5" />
      <path d="M20 20v-4.5h-4.5" />
    </svg>
  );
}

function SmsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5.5h16v10H9l-4 3.5v-3.5H4z" />
      <path d="M8 9.5h8M8 12.5h5" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}

function ChevronRightSmallIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export function DebtorsList({ debtors, role }: { debtors: DebtorRow[]; role: Role }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [rows, setRows] = useState<DebtorRow[]>(debtors);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [smsRowId, setSmsRowId] = useState<string | null>(null);
  const editable = canEdit(role);
  const smsRow = rows.find((r) => r.id === smsRowId) || null;

  function updateRowMessages(id: string, messages: DebtorMessage[]) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, messages } : r)));
  }

  const lastSynced = rows.reduce<string | null>((latest, r) => {
    if (!latest || r.lastSyncedAt > latest) return r.lastSyncedAt;
    return latest;
  }, null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const haystack = `${r.firstName} ${r.lastName} ${r.phoneNumber ?? ""} ${r.vehicleName ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  async function sync() {
    setSyncing(true);
    setSyncError(null);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/debtors/sync", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSyncError(data.error || t("debtors_sync_error"));
        return;
      }
      setSyncMessage(
        `${t("debtors_sync_success")}: ${data.created ?? 0} ${t("debtors_new")}, ${data.updated ?? 0} ${t("debtors_updated")}`
      );
      const listRes = await fetch("/api/debtors");
      if (listRes.ok) {
        const list: DebtorRow[] = await listRes.json();
        setRows(list);
      }
      router.refresh();
    } catch {
      setSyncError(t("debtors_sync_error"));
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[26px] font-semibold text-ink">{t("debtors_title")}</h1>
          <p className="mt-1 text-sm text-muted">
            {lastSynced
              ? `${t("debtors_last_synced")}: ${new Date(lastSynced).toLocaleString("ru-RU")}`
              : t("debtors_never_synced")}
          </p>
        </div>
        {editable && (
          <button
            onClick={sync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-violet px-4 py-2.5 text-sm font-medium text-white shadow-glowViolet transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <RefreshIcon spinning={syncing} />
            {syncing ? t("debtors_syncing") : t("debtors_sync_btn")}
          </button>
        )}
      </div>

      {syncMessage && (
        <div className="mb-4 rounded-lg border border-mint/30 bg-mintDim/40 px-3 py-2 text-xs text-mint">
          {syncMessage}
        </div>
      )}
      {syncError && (
        <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {syncError}
        </div>
      )}

      <div className="relative mb-5">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint">
          <SearchIcon />
        </span>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder={t("debtors_search_placeholder")}
          className="w-full rounded-xl border border-line bg-bg2 py-3 pl-11 pr-4 text-sm text-ink outline-none transition-colors focus:border-violet/50"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="panel flex flex-col items-center gap-1 py-14 text-center">
          <div className="text-sm text-ink">{t("debtors_empty_title")}</div>
          <div className="text-xs text-muted">{t("debtors_empty_subtitle")}</div>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_debtor")}</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_client_phone")}</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_client_vehicle")}</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_last_payoff")}</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_balance")}</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("actions_label")}</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r) => {
                  const avatar = avatarStyle(r.firstName);
                  return (
                    <tr key={r.id} className="border-b border-line/60 transition-colors last:border-0 hover:bg-panel2/40">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatar.bg} ${avatar.text}`}>
                            {initials(r.firstName, r.lastName)}
                          </span>
                          <span className="font-medium text-ink">
                            {r.firstName} {r.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {r.phoneNumber ? (
                          <a
                            href={`tel:${r.phoneNumber.replace(/\s+/g, "")}`}
                            className="inline-flex items-center gap-1.5 text-ink transition-colors hover:text-violet"
                          >
                            {r.phoneNumber}
                            <span className="text-faint"><PhoneIcon /></span>
                          </a>
                        ) : (
                          <span className="text-faint">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-muted">{r.vehicleName || "—"}</td>
                      <td className="px-5 py-3.5 text-muted">
                        {r.dateOfLastUnpaidPayoff
                          ? new Date(r.dateOfLastUnpaidPayoff).toLocaleDateString("ru-RU")
                          : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={
                            r.currentBalance < 0
                              ? "rounded-lg border border-danger/30 bg-danger/10 px-3 py-1.5 text-[12px] font-medium text-danger"
                              : "rounded-lg border border-line bg-bg2 px-3 py-1.5 text-[12px] font-medium text-ink"
                          }
                        >
                          {formatMoney(r.currentBalance)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => setSmsRowId(r.id)}
                          disabled={!r.phoneNumber}
                          title={r.phoneNumber ? t("debtors_send_sms_btn") : t("notify_no_phone")}
                          className={
                            r.messages.some((m) => m.status === "SENT")
                              ? "inline-flex h-8 items-center gap-1.5 rounded-lg border border-mint/40 bg-mintDim/40 px-3 text-[12px] font-medium text-mint transition-opacity hover:opacity-80 disabled:opacity-40"
                              : "inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-bg2 px-3 text-[12px] font-medium text-ink transition-colors hover:border-violet/40 hover:text-violet disabled:opacity-40"
                          }
                        >
                          <SmsIcon />
                          {t("debtors_send_sms_btn")}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3.5">
            <div className="text-xs text-muted">
              {t("total_clients_label")}: {filtered.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-violet/40 hover:text-violet disabled:opacity-40"
              >
                <ChevronLeftIcon />
              </button>
              <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-violet/40 px-2 text-xs font-medium text-violet">
                {currentPage}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-violet/40 hover:text-violet disabled:opacity-40"
              >
                <ChevronRightSmallIcon />
              </button>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="h-8 rounded-lg border border-line bg-bg2 px-2 text-xs text-ink outline-none"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n} {t("per_page_label")}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {smsRow && (
        <SmsModal
          row={smsRow}
          onClose={() => setSmsRowId(null)}
          onChange={(messages) => updateRowMessages(smsRow.id, messages)}
        />
      )}
    </div>
  );
}

function SmsModal({
  row,
  onClose,
  onChange,
}: {
  row: DebtorRow;
  onClose: () => void;
  onChange: (messages: DebtorMessage[]) => void;
}) {
  const { t } = useTranslation();
  const template = t("debtors_sms_template")
    .replace("{name}", row.firstName)
    .replace("{amount}", formatMoney(Math.abs(row.currentBalance)));
  const [message, setMessage] = useState(template);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function send() {
    if (!message.trim()) return;
    setSending(true);
    setError(null);
    setSent(false);
    const res = await fetch(`/api/debtors/${row.id}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    setSending(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || t("notify_send_failed"));
      onChange([data, ...row.messages].filter((m) => m && m.id));
      return;
    }
    setSent(true);
    onChange([data, ...row.messages]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-sm px-4 py-8">
      <div className="panel w-full max-w-sm p-6 animate-rise">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">{t("debtors_send_sms_btn")}</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            ✕
          </button>
        </div>
        <div className="mb-4 text-xs text-muted">
          {row.firstName} {row.lastName} · {row.phoneNumber}
        </div>

        <label className="mb-1 block label-eyebrow">{t("notify_message_label")}</label>
        <textarea
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mb-3 w-full resize-none rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-violet/50"
        />

        {error && (
          <div className="mb-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}
        {sent && !error && (
          <div className="mb-3 rounded-lg border border-mint/30 bg-mintDim/40 px-3 py-2 text-xs text-mint">
            {t("notify_sent_ok")}
          </div>
        )}

        <button
          onClick={send}
          disabled={sending || !message.trim()}
          className="w-full rounded-lg border border-violet/40 bg-violetDim/40 py-2.5 text-sm font-medium text-violet transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {sending ? t("notify_sending") : t("notify_send_btn")}
        </button>

        {row.messages.length > 0 && (
          <div className="mt-4 max-h-40 space-y-1.5 overflow-y-auto border-t border-line pt-3">
            {row.messages.map((m) => (
              <div key={m.id} className="rounded-lg border border-line bg-bg2 px-3 py-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-faint">{new Date(m.createdAt).toLocaleString("ru-RU")}</span>
                  <span className={m.status === "SENT" ? "text-mint" : "text-danger"}>
                    {m.status === "SENT" ? t("notify_status_sent") : t("notify_status_failed")}
                  </span>
                </div>
                <p className="mt-1 text-ink">{m.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
