"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { canEdit } from "@/lib/roles";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import type { Lang } from "@/lib/i18n/translations";

type ClientVehicle = { id: string; code: string; name: string };

type ClientRow = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  createdAt: string;
  vehicles: ClientVehicle[];
};

type StatusFilter = "ALL" | "RENTING" | "NOT_RENTING";
type SortKey = "recent" | "name" | "status";
type SortDir = "asc" | "desc";

const LOCALE_MAP: Record<Lang, string> = { ru: "ru-RU", pl: "pl-PL", uk: "uk-UA" };

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

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "?";
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

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4.5 6.5 7.5 6 7.5-6" />
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

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14" />
    </svg>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform ${active ? "text-ink" : "text-faint"} ${
        active && dir === "asc" ? "rotate-180" : ""
      }`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function exportClientsCsv(rows: ClientRow[]) {
  const headers = ["Имя", "Фамилия", "Телефон", "Почта", "Арендует сейчас", "В базе с"];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(";")];
  for (const r of rows) {
    lines.push(
      [
        r.firstName,
        r.lastName,
        r.phone,
        r.email ?? "",
        r.vehicles.map((v) => v.name).join(", "),
        new Date(r.createdAt).toLocaleDateString("ru-RU"),
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
  a.download = `clients-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ClientsList({
  clients,
  role,
}: {
  clients: ClientRow[];
  role: "ADMIN" | "MANAGER" | "VIEWER";
}) {
  const router = useRouter();
  const { t, lang } = useTranslation();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [formOpen, setFormOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const editable = canEdit(role);

  async function syncFromRented() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/clients/backfill", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setSyncResult(data.error || "Не удалось выполнить перенос");
        return;
      }
      const parts = [`Создано карточек: ${data.created}`, `Привязано к существующим: ${data.linked}`];
      if (data.skipped?.length) {
        parts.push(
          `Пропущено (нет телефона): ${data.skipped.map((s: { code: string }) => s.code).join(", ")}`
        );
      }
      setSyncResult(parts.join(". "));
      router.refresh();
    } finally {
      setSyncing(false);
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "recent" ? "desc" : "asc");
    }
  }

  const counts = useMemo(() => {
    const renting = clients.filter((c) => c.vehicles.length > 0).length;
    return { total: clients.length, renting, notRenting: clients.length - renting };
  }, [clients]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = clients.filter((c) => {
      if (statusFilter === "RENTING" && c.vehicles.length === 0) return false;
      if (statusFilter === "NOT_RENTING" && c.vehicles.length > 0) return false;
      if (!q) return true;
      const haystack = `${c.firstName} ${c.lastName} ${c.phone} ${c.email || ""}`.toLowerCase();
      return haystack.includes(q);
    });

    rows = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      } else if (sortKey === "status") {
        cmp = a.vehicles.length > 0 === (b.vehicles.length > 0) ? 0 : a.vehicles.length > 0 ? -1 : 1;
      } else {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return rows;
  }, [clients, query, statusFilter, sortKey, sortDir]);

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="label-eyebrow mb-1">{t("clients_eyebrow")}</div>
          <h1 className="font-display text-2xl font-semibold text-ink">{t("clients_title")}</h1>
        </div>
        {editable && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={syncFromRented}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-line bg-bg2 px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-violet/40 hover:text-violet disabled:opacity-60"
            >
              <RefreshIcon spinning={syncing} />
              {syncing ? "Переносим…" : "Перенести из аренды"}
            </button>
            <button onClick={() => setFormOpen(true)} className="btn-primary">
              {t("new_client_btn")}
            </button>
          </div>
        )}
      </div>

      {syncResult && (
        <div className="mb-5 rounded-lg border border-violet/30 bg-violetDim/20 px-3 py-2.5 text-xs text-violet">
          {syncResult}
        </div>
      )}

      {/* Сводная статистика */}
      <div className="panel mb-5 grid grid-cols-1 divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="px-5 py-4">
          <div className="label-eyebrow">{t("clients_stat_total")}</div>
          <div className="mt-1 font-display text-2xl font-semibold text-ink">{counts.total}</div>
        </div>
        <div className="px-5 py-4">
          <div className="label-eyebrow">{t("clients_stat_renting")}</div>
          <div className="mt-1 font-display text-2xl font-semibold text-mint">{counts.renting}</div>
        </div>
        <div className="px-5 py-4">
          <div className="label-eyebrow">{t("clients_stat_not_renting")}</div>
          <div className="mt-1 font-display text-2xl font-semibold text-muted">{counts.notRenting}</div>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">
            <SearchIcon />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("clients_search_placeholder")}
            className="w-full rounded-lg border border-line bg-bg2 py-2.5 pl-9 pr-3 text-sm text-ink outline-none focus:border-cyan/50"
          />
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-line bg-panel p-1">
          {([
            ["ALL", t("clients_filter_all"), counts.total],
            ["RENTING", t("clients_filter_renting"), counts.renting],
            ["NOT_RENTING", t("clients_filter_not_renting"), counts.notRenting],
          ] as const).map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                statusFilter === key ? "bg-panel2 text-ink" : "text-muted hover:text-ink"
              }`}
            >
              {label} <span className="text-faint">· {count}</span>
            </button>
          ))}
        </div>

        {clients.length > 0 && (
          <button
            onClick={() => exportClientsCsv(filtered)}
            className="ml-auto inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-line bg-bg2 px-3 py-2 text-xs font-medium text-muted transition-colors hover:border-cyan/40 hover:text-cyan"
          >
            <DownloadIcon />
            {t("clients_export_csv")}
          </button>
        )}
      </div>

      {clients.length === 0 ? (
        <div className="panel flex flex-col items-center gap-1 py-14 text-center">
          <div className="text-sm text-ink">{t("clients_empty_title")}</div>
          <div className="text-xs text-muted">{t("clients_empty_subtitle")}</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel flex flex-col items-center gap-1 py-14 text-center">
          <div className="text-sm text-ink">{t("clients_search_empty_title")}</div>
          <div className="text-xs text-muted">{t("clients_search_empty_subtitle")}</div>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className="px-5 py-3 font-normal">
                    <button
                      onClick={() => toggleSort("name")}
                      className="label-eyebrow inline-flex items-center gap-1 hover:text-ink"
                    >
                      {t("col_client_name")}
                      <SortIcon active={sortKey === "name"} dir={sortDir} />
                    </button>
                  </th>
                  <th className="px-5 py-3 font-normal label-eyebrow">{t("col_client_phone")}</th>
                  <th className="px-5 py-3 font-normal label-eyebrow">{t("col_client_email")}</th>
                  <th className="px-5 py-3 font-normal">
                    <button
                      onClick={() => toggleSort("status")}
                      className="label-eyebrow inline-flex items-center gap-1 hover:text-ink"
                    >
                      {t("col_client_vehicle")}
                      <SortIcon active={sortKey === "status"} dir={sortDir} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const style = avatarStyle(c.firstName || c.lastName || c.id);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/clients/${c.id}`)}
                      className="cursor-pointer border-b border-line/60 transition-colors last:border-0 hover:bg-panel2/60"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${style.bg} ${style.text}`}
                          >
                            {initials(c.firstName, c.lastName)}
                          </div>
                          <div>
                            <div className="text-ink">
                              {c.firstName} {c.lastName}
                            </div>
                            <div className="text-[11px] text-faint">
                              {new Date(c.createdAt).toLocaleDateString(LOCALE_MAP[lang])}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <a
                          href={`tel:${c.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          title={t("clients_call_action")}
                          className="inline-flex items-center gap-1.5 font-mono text-xs text-muted transition-colors hover:text-cyan"
                        >
                          <PhoneIcon />
                          {c.phone}
                        </a>
                      </td>
                      <td className="px-5 py-3">
                        {c.email ? (
                          <a
                            href={`mailto:${c.email}`}
                            onClick={(e) => e.stopPropagation()}
                            title={t("clients_email_action")}
                            className="inline-flex items-center gap-1.5 font-mono text-xs text-muted transition-colors hover:text-cyan"
                          >
                            <MailIcon />
                            {c.email}
                          </a>
                        ) : (
                          <span className="text-xs text-faint">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {c.vehicles.length === 0 ? (
                          <span className="rounded-md border border-line bg-bg2 px-2 py-0.5 text-[11px] text-faint">
                            {t("clients_not_renting")}
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {c.vehicles.map((v) => (
                              <span
                                key={v.id}
                                className="rounded-md border border-mint/40 bg-mintDim/40 px-2 py-0.5 text-[11px] text-mint"
                              >
                                {v.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-5 py-2.5 text-[11px] text-faint">
            {t("clients_showing_count", { shown: filtered.length, total: clients.length })}
          </div>
        </div>
      )}

      {formOpen && (
        <NewClientModal
          onClose={() => setFormOpen(false)}
          onCreated={(client) => {
            setFormOpen(false);
            router.push(`/clients/${client.id}`);
          }}
        />
      )}
    </div>
  );
}

function NewClientModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (c: { id: string }) => void;
}) {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      setError(t("clients_fill_required"));
      return;
    }
    setError(null);
    setLoading(true);
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, phone, email }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || t("create_failed"));
      return;
    }
    const client = await res.json();
    onCreated(client);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-sm px-4 py-8">
      <form onSubmit={submit} className="panel w-full max-w-sm p-6 animate-rise">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">{t("new_client_title")}</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            ✕
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block label-eyebrow">{t("field_renter_first_name")}</label>
            <input
              required
              autoFocus
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={t("renter_first_name_placeholder")}
              className="w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
            />
          </div>
          <div>
            <label className="mb-1 block label-eyebrow">{t("field_renter_last_name")}</label>
            <input
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={t("renter_last_name_placeholder")}
              className="w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
            />
          </div>
        </div>

        <label className="mb-1 block label-eyebrow">{t("field_renter_phone")}</label>
        <input
          required
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t("renter_phone_placeholder")}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        />

        <label className="mb-1 block label-eyebrow">{t("field_renter_email")}</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("renter_email_placeholder")}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        />

        {error && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg border border-cyan/40 bg-cyanDim/40 py-2.5 text-sm font-medium text-cyan transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? t("creating") : t("create")}
        </button>
      </form>
    </div>
  );
}
