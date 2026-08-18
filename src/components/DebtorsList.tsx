"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { canEdit, Role } from "@/lib/roles";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import type { TranslationKey } from "@/lib/i18n/translations";
import { DebtorsSummaryCard, type DebtorsSummary } from "./DebtorsSummaryCard";
import { SMS_SENDERS, type SmsSender } from "@/lib/smsSenders";

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
  return `${value.toLocaleString("ru-RU", { maximumFractionDigits: 2 })}\u00A0zł`;
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

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 8v.01" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14" />
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

function exportDebtorsCsv(rows: DebtorRow[]) {
  const headers = [
    "Имя",
    "Фамилия",
    "Телефон",
    "Организация",
    "Техника",
    "Баланс",
    "Последняя невыплата",
    "Связались",
    "Заметка",
  ];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(";")];
  for (const r of rows) {
    lines.push(
      [
        r.firstName,
        r.lastName,
        r.phoneNumber ?? "",
        r.organisation ?? "",
        r.vehicleName ?? "",
        formatMoney(r.currentBalance),
        r.dateOfLastUnpaidPayoff ? new Date(r.dateOfLastUnpaidPayoff).toLocaleDateString("ru-RU") : "",
        r.isContactedForDebt ? "да" : "нет",
        r.debtNotes ?? "",
      ]
        .map((v) => escape(String(v)))
        .join(";")
    );
  }
  const csv = "\uFEFF" + lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `debtors-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function DebtorsList({
  debtors,
  role,
  summary,
}: {
  debtors: DebtorRow[];
  role: Role;
  summary: DebtorsSummary;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const [rows, setRows] = useState<DebtorRow[]>(debtors);
  const [summaryState, setSummaryState] = useState<DebtorsSummary>(summary);
  const [query, setQuery] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc"); // desc = крупные долги сверху
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [smsRowId, setSmsRowId] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [debtInfoRowId, setDebtInfoRowId] = useState<string | null>(null);
  const editable = canEdit(role);
  const smsRow = rows.find((r) => r.id === smsRowId) || null;
  const debtInfoRow = rows.find((r) => r.id === debtInfoRowId) || null;

  function updateRow(id: string, patch: Partial<DebtorRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  const lastSynced = rows.reduce<string | null>((latest, r) => {
    if (!latest || r.lastSyncedAt > latest) return r.lastSyncedAt;
    return latest;
  }, null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = minAmount.trim() ? Number(minAmount) : null;
    let list = rows.filter((r) => {
      if (q) {
        const haystack = `${r.firstName} ${r.lastName} ${r.phoneNumber ?? ""} ${r.vehicleName ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (min !== null && Number.isFinite(min)) {
        const debtAmount = r.currentBalance < 0 ? Math.abs(r.currentBalance) : 0;
        if (debtAmount <= min) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) =>
      sortDir === "desc" ? a.currentBalance - b.currentBalance : b.currentBalance - a.currentBalance
    );
    return list;
  }, [rows, query, minAmount, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const allFilteredSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));
  const selectedRows = rows.filter((r) => selected.has(r.id));

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => {
      if (allFilteredSelected) return new Set();
      return new Set(filtered.map((r) => r.id));
    });
  }

  async function refreshSummary() {
    try {
      const res = await fetch("/api/debtors/summary");
      if (res.ok) setSummaryState(await res.json());
    } catch {
      // не критично — карточка просто не обновится до следующей перезагрузки
    }
  }

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
        const list: Omit<DebtorRow, "messages">[] = await listRes.json();
        setRows((prev) =>
          list.map((d) => ({
            ...d,
            messages: prev.find((p) => p.id === d.id)?.messages ?? [],
          }))
        );
      }
      await refreshSummary();
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
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportDebtorsCsv(filtered)}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-line bg-bg2 px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-violet/40 hover:text-violet disabled:opacity-50"
          >
            <DownloadIcon />
            {t("debtors_export_btn")}
          </button>
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
      </div>

      <DebtorsSummaryCard summary={summaryState} />

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

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative flex-1 basis-64">
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
        <input
          value={minAmount}
          onChange={(e) => {
            setMinAmount(e.target.value);
            setPage(1);
          }}
          type="number"
          min={0}
          placeholder={t("debtors_filter_min_placeholder")}
          className="w-40 rounded-xl border border-line bg-bg2 px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-violet/50"
        />
        <select
          value={sortDir}
          onChange={(e) => setSortDir(e.target.value as "desc" | "asc")}
          className="rounded-xl border border-line bg-bg2 px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-violet/50"
        >
          <option value="desc">{t("debtors_sort_desc")}</option>
          <option value="asc">{t("debtors_sort_asc")}</option>
        </select>
      </div>

      {editable && selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet/30 bg-violetDim/30 px-4 py-3">
          <span className="text-sm text-ink">{t("debtors_selected_count", { count: selected.size })}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-muted transition-colors hover:text-ink"
            >
              {t("cancel")}
            </button>
            <button
              onClick={() => setBulkOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet px-3.5 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
            >
              <SmsIcon />
              {t("debtors_bulk_send_btn")}
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="panel flex flex-col items-center gap-1 py-14 text-center">
          <div className="text-sm text-ink">{t("debtors_empty_title")}</div>
          <div className="text-xs text-muted">{t("debtors_empty_subtitle")}</div>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-muted">
                  {editable && (
                    <th className="w-10 px-5 py-3.5">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-line accent-violet"
                      />
                    </th>
                  )}
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_debtor")}</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_client_phone")}</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_client_vehicle")}</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_last_payoff")}</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_balance")}</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_contacted")}</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_notes")}</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("actions_label")}</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r) => {
                  const avatar = avatarStyle(r.firstName);
                  return (
                    <tr key={r.id} className="border-b border-line/60 transition-colors last:border-0 hover:bg-panel2/40">
                      {editable && (
                        <td className="px-5 py-3.5">
                          <input
                            type="checkbox"
                            checked={selected.has(r.id)}
                            onChange={() => toggleSelect(r.id)}
                            className="h-4 w-4 rounded border-line accent-violet"
                          />
                        </td>
                      )}
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
                              ? "inline-block whitespace-nowrap rounded-lg border border-danger/30 bg-danger/10 px-3 py-1.5 text-[12px] font-medium text-danger"
                              : "inline-block whitespace-nowrap rounded-lg border border-line bg-bg2 px-3 py-1.5 text-[12px] font-medium text-ink"
                          }
                        >
                          {formatMoney(r.currentBalance)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {r.isContactedForDebt ? (
                          <span className="inline-block whitespace-nowrap rounded-lg border border-mint/30 bg-mintDim/40 px-2.5 py-1 text-[11px] font-medium text-mint">
                            {t("debtors_contacted_badge")}
                          </span>
                        ) : (
                          <span className="text-faint">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <NotesCell debtor={r} editable={editable} onSaved={(notes) => updateRow(r.id, { debtNotes: notes })} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => setDebtInfoRowId(r.id)}
                            title={t("debtors_debt_info_btn")}
                            className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border border-line bg-bg2 px-3 text-[12px] font-medium text-ink transition-colors hover:border-cyan/40 hover:text-cyan"
                          >
                            <InfoIcon />
                            {t("debtors_debt_info_btn")}
                          </button>
                          <button
                            onClick={() => setSmsRowId(r.id)}
                            disabled={!r.phoneNumber}
                            title={r.phoneNumber ? t("debtors_send_sms_btn") : t("notify_no_phone")}
                            className={
                              r.messages.some((m) => m.status === "SENT")
                                ? "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border border-mint/40 bg-mintDim/40 px-3 text-[12px] font-medium text-mint transition-opacity hover:opacity-80 disabled:opacity-40"
                                : "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border border-line bg-bg2 px-3 text-[12px] font-medium text-ink transition-colors hover:border-violet/40 hover:text-violet disabled:opacity-40"
                            }
                          >
                            <SmsIcon />
                            {t("debtors_send_sms_btn")}
                          </button>
                        </div>
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
          onSuccess={(message) => {
            updateRow(smsRow.id, { messages: [message, ...smsRow.messages], isContactedForDebt: true });
          }}
          onFailure={(message) => {
            updateRow(smsRow.id, { messages: [message, ...smsRow.messages] });
          }}
        />
      )}

      {debtInfoRow && (
        <DebtInfoModal row={debtInfoRow} onClose={() => setDebtInfoRowId(null)} />
      )}

      {bulkOpen && (
        <BulkSmsModal
          debtors={selectedRows}
          onClose={() => setBulkOpen(false)}
          onDone={(results) => {
            setRows((prev) =>
              prev.map((r) => {
                const res = results.find((x) => x.id === r.id);
                if (res && res.ok) return { ...r, isContactedForDebt: true };
                return r;
              })
            );
          }}
        />
      )}
    </div>
  );
}

function NotesCell({
  debtor,
  editable,
  onSaved,
}: {
  debtor: DebtorRow;
  editable: boolean;
  onSaved: (notes: string | null) => void;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState(debtor.debtNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);

  async function save() {
    const original = debtor.debtNotes ?? "";
    if (value === original) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/debtors/${debtor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ debtNotes: value }),
      });
      if (res.ok) {
        const normalized = value.trim() || null;
        onSaved(normalized);
        setValue(normalized ?? "");
        setSavedTick(true);
        setTimeout(() => setSavedTick(false), 1500);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!editable) {
    return <span className="text-muted">{debtor.debtNotes || "—"}</span>;
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        placeholder={t("debtors_notes_placeholder")}
        className="w-40 rounded-lg border border-line bg-bg2 px-2.5 py-1.5 text-xs text-ink outline-none transition-colors focus:border-violet/50"
      />
      {saving && <span className="shrink-0 text-[10px] text-faint">…</span>}
      {savedTick && !saving && <span className="shrink-0 text-[10px] text-mint">✓</span>}
    </div>
  );
}

type Template = "soft" | "hard" | "final" | "custom";

function SmsModal({
  row,
  onClose,
  onSuccess,
  onFailure,
}: {
  row: DebtorRow;
  onClose: () => void;
  onSuccess: (message: DebtorMessage) => void;
  onFailure: (message: DebtorMessage) => void;
}) {
  const { t } = useTranslation();
  const amount = formatMoney(Math.abs(row.currentBalance));

  function templateBody(tpl: Template) {
    if (tpl === "soft") return t("debtors_template_soft_body").replace("{name}", row.firstName).replace("{amount}", amount);
    if (tpl === "hard") return t("debtors_template_hard_body").replace("{name}", row.firstName).replace("{amount}", amount);
    if (tpl === "final") return t("debtors_template_final_body").replace("{name}", row.firstName).replace("{amount}", amount);
    return "";
  }

  const [template, setTemplate] = useState<Template>("soft");
  const [message, setMessage] = useState(templateBody("soft"));
  const [sender, setSender] = useState<SmsSender>("TEST");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [history, setHistory] = useState<DebtorMessage[]>(row.messages);

  function applyTemplate(next: Template) {
    setTemplate(next);
    setMessage(templateBody(next));
  }

  async function send() {
    if (!message.trim()) return;
    setSending(true);
    setError(null);
    setSent(false);
    const res = await fetch(`/api/debtors/${row.id}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, sender }),
    });
    setSending(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || t("notify_send_failed"));
      if (data?.id) {
        setHistory((prev) => [data, ...prev]);
        onFailure(data);
      }
      return;
    }
    setSent(true);
    setHistory((prev) => [data, ...prev]);
    onSuccess(data);
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

        <div className="mb-3">
          <label className="mb-1 block label-eyebrow">{t("debtors_template_label")}</label>
          <select
            value={template}
            onChange={(e) => applyTemplate(e.target.value as Template)}
            className="w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-violet/50"
          >
            <option value="soft">{t("debtors_template_soft_title")}</option>
            <option value="hard">{t("debtors_template_hard_title")}</option>
            <option value="final">{t("debtors_template_final_title")}</option>
            <option value="custom">{t("notify_template_custom")}</option>
          </select>
        </div>

        <div className="mb-3">
          <label className="mb-1 block label-eyebrow">{t("notify_sender_label")}</label>
          <select
            value={sender}
            onChange={(e) => setSender(e.target.value as SmsSender)}
            className="w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-violet/50"
          >
            {SMS_SENDERS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
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

        {history.length > 0 && (
          <div className="mt-4 max-h-40 space-y-1.5 overflow-y-auto border-t border-line pt-3">
            {history.map((m) => (
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

type DebtDetailItem = {
  id: number;
  date: string | null;
  vehicleName: string | null;
  reason: string | null;
  quota: number;
  remainingPayoff: number;
  comments: string | null;
};

type DebtDetailsResponse = {
  currentBalance: number;
  balanceWithDeposits: number | null;
  items: DebtDetailItem[];
  fetchedAt: string;
};

const REASON_LABEL_KEYS: Partial<Record<string, TranslationKey>> = {
  TransportRent: "debtors_reason_transport_rent",
};

// ravapi.eu отдаёт "reason" как код (например "TransportRent"), а не готовый
// текст. Известные коды переводим через словарь выше; для незнакомых —
// разбиваем CamelCase на слова, чтобы было хоть немного читаемо.
function reasonLabel(code: string | null, t: (key: TranslationKey) => string): string {
  if (!code) return t("debtors_debt_info_no_reason");
  const key = REASON_LABEL_KEYS[code];
  if (key) return t(key);
  return code.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

function DebtInfoModal({ row, onClose }: { row: DebtorRow; onClose: () => void }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DebtDetailsResponse | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/debtors/${row.id}/debt-details`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || t("debtors_debt_info_error"));
        return;
      }
      setData(body);
    } catch {
      setError(t("debtors_debt_info_error"));
    } finally {
      setLoading(false);
    }
  }

  // Всегда свежие данные — тянем заново при каждом открытии окна.
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-sm px-4 py-8">
      <div className="panel w-full max-w-lg p-6 animate-rise">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">{t("debtors_debt_info_title")}</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            ✕
          </button>
        </div>
        <div className="mb-4 text-xs text-muted">
          {row.firstName} {row.lastName}
          {row.vehicleName ? ` · ${row.vehicleName}` : ""}
        </div>

        {loading && (
          <div className="flex items-center gap-2 py-8 text-sm text-muted">
            <RefreshIcon spinning />
            {t("debtors_debt_info_loading")}
          </div>
        )}

        {!loading && error && (
          <div className="space-y-3">
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
              {error}
            </div>
            <button
              onClick={load}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-bg2 px-3.5 py-2 text-xs font-medium text-ink transition-colors hover:border-violet/40 hover:text-violet"
            >
              <RefreshIcon />
              {t("debtors_debt_info_retry")}
            </button>
          </div>
        )}

        {!loading && !error && data && (
          <>
            <div className="mb-4 flex items-center justify-between rounded-xl border border-line bg-bg2 px-4 py-3">
              <span className="text-xs text-muted">{t("debtors_debt_info_current_balance")}</span>
              <span
                className={
                  data.currentBalance < 0
                    ? "text-sm font-semibold text-danger"
                    : "text-sm font-semibold text-ink"
                }
              >
                {formatMoney(data.currentBalance)}
              </span>
            </div>

            {data.items.length === 0 ? (
              <div className="panel flex flex-col items-center gap-1 py-10 text-center">
                <div className="text-sm text-ink">{t("debtors_debt_info_empty")}</div>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto rounded-xl border border-line">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-line bg-bg2 text-muted">
                      <th className="px-3 py-2 font-medium">{t("debtors_debt_info_col_date")}</th>
                      <th className="px-3 py-2 font-medium">{t("debtors_debt_info_col_reason")}</th>
                      <th className="px-3 py-2 font-medium">{t("debtors_debt_info_col_amount")}</th>
                      <th className="px-3 py-2 font-medium">{t("debtors_debt_info_col_remaining")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item) => (
                      <tr key={item.id} className="border-b border-line/60 last:border-0">
                        <td className="whitespace-nowrap px-3 py-2 text-muted">
                          {item.date ? new Date(item.date).toLocaleDateString("ru-RU") : "—"}
                        </td>
                        <td className="px-3 py-2 text-ink">
                          {reasonLabel(item.reason, t)}
                          {item.vehicleName && (
                            <span className="ml-1 text-faint">({item.vehicleName})</span>
                          )}
                          {item.comments && (
                            <div className="mt-0.5 text-[11px] text-faint">{item.comments}</div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right font-medium text-danger">
                          {formatMoney(item.quota)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-muted">
                          {formatMoney(item.remainingPayoff)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-3 text-[10px] text-faint">{t("debtors_debt_info_fetched_at")}</div>
          </>
        )}
      </div>
    </div>
  );
}

function BulkSmsModal({
  debtors,
  onClose,
  onDone,
}: {
  debtors: DebtorRow[];
  onClose: () => void;
  onDone: (results: { id: string; ok: boolean; error?: string }[]) => void;
}) {
  const { t } = useTranslation();
  const withPhone = debtors.filter((d) => d.phoneNumber);
  const withoutPhone = debtors.length - withPhone.length;

  const [template, setTemplate] = useState<Template>("soft");
  const [message, setMessage] = useState(t("debtors_template_soft_body"));
  const [sender, setSender] = useState<SmsSender>("TEST");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

  function applyTemplate(next: Template) {
    setTemplate(next);
    if (next === "soft") setMessage(t("debtors_template_soft_body"));
    else if (next === "hard") setMessage(t("debtors_template_hard_body"));
    else if (next === "final") setMessage(t("debtors_template_final_body"));
    else setMessage("");
  }

  async function send() {
    if (!message.trim() || withPhone.length === 0) return;
    setSending(true);
    setError(null);
    setResult(null);
    const res = await fetch("/api/debtors/bulk-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: withPhone.map((d) => d.id), message, sender }),
    });
    setSending(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || t("notify_send_failed"));
      return;
    }
    setResult({ sent: data.sent ?? 0, failed: data.failed ?? 0 });
    onDone(data.results || []);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-sm px-4 py-8">
      <div className="panel w-full max-w-sm p-6 animate-rise">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">{t("debtors_bulk_send_title")}</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            ✕
          </button>
        </div>
        <div className="mb-4 text-xs text-muted">
          {t("debtors_bulk_send_hint", { count: withPhone.length })}
          {withoutPhone > 0 && (
            <span className="ml-1 text-danger">
              ({withoutPhone} {t("notify_no_phone").toLowerCase()})
            </span>
          )}
        </div>

        {withPhone.length === 0 ? (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {t("debtors_bulk_none_selected")}
          </div>
        ) : (
          <>
            <div className="mb-3">
              <label className="mb-1 block label-eyebrow">{t("debtors_template_label")}</label>
              <select
                value={template}
                onChange={(e) => applyTemplate(e.target.value as Template)}
                className="w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-violet/50"
              >
                <option value="soft">{t("debtors_template_soft_title")}</option>
                <option value="hard">{t("debtors_template_hard_title")}</option>
                <option value="final">{t("debtors_template_final_title")}</option>
                <option value="custom">{t("notify_template_custom")}</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="mb-1 block label-eyebrow">{t("notify_sender_label")}</label>
              <select
                value={sender}
                onChange={(e) => setSender(e.target.value as SmsSender)}
                className="w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-violet/50"
              >
                {SMS_SENDERS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
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
            {result && !error && (
              <div className="mb-3 rounded-lg border border-mint/30 bg-mintDim/40 px-3 py-2 text-xs text-mint">
                {t("debtors_bulk_send_result", { sent: result.sent, failed: result.failed })}
              </div>
            )}

            <button
              onClick={send}
              disabled={sending || !message.trim()}
              className="w-full rounded-lg border border-violet/40 bg-violetDim/40 py-2.5 text-sm font-medium text-violet transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {sending ? t("notify_sending") : t("notify_send_btn")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
