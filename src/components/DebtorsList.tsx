"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { canEdit, Role } from "@/lib/roles";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

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
  const editable = canEdit(role);

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
    </div>
  );
}
