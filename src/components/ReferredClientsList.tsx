"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { canEdit, isAdmin, isAmbassador, Role } from "@/lib/roles";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { TranslationKey } from "@/lib/i18n/translations";

type ReferredVehicle = { id: string; code: string; name: string };

type Payout = {
  id: string;
  amount: number;
  note: string | null;
  createdByName: string | null;
  createdAt: string;
};

type AmbassadorOption = { id: string; name: string };

type InvitationType = "FLEET_PARTNER" | "RENT" | "FLEET_PARTNER_RENT";
type ReferredStatus = "ACTIVE" | "PENDING" | "IN_PROGRESS" | "INACTIVE";

const STATUSES: ReferredStatus[] = ["ACTIVE", "PENDING", "IN_PROGRESS", "INACTIVE"];
const STATUS_LABEL_KEYS: Record<ReferredStatus, TranslationKey> = {
  ACTIVE: "status_active",
  PENDING: "status_pending",
  IN_PROGRESS: "status_in_progress",
  INACTIVE: "status_inactive",
};
// Цвет пилюли статуса: заливка для «активных» состояний, контурный вариант — для нейтральных
const STATUS_STYLE: Record<ReferredStatus, string> = {
  ACTIVE: "border border-mint/30 bg-mint text-white",
  PENDING: "border border-violet/30 bg-violetDim/60 text-violet",
  IN_PROGRESS: "border border-amber/30 bg-amber text-white",
  INACTIVE: "border border-line bg-panel2/70 text-muted",
};

const INVITATION_TYPES: InvitationType[] = ["FLEET_PARTNER", "RENT", "FLEET_PARTNER_RENT"];
const INVITATION_LABEL_KEYS: Record<InvitationType, TranslationKey> = {
  FLEET_PARTNER: "invitation_fleet_partner",
  RENT: "invitation_rent",
  FLEET_PARTNER_RENT: "invitation_fleet_partner_rent",
};
// Цвет и иконка пилюли типа приглашения — разные для каждого типа
const INVITATION_STYLE: Record<InvitationType, string> = {
  FLEET_PARTNER: "border border-amber/40 bg-amberDim/50 text-amber",
  RENT: "border border-cyan/40 bg-cyanDim/50 text-cyan",
  FLEET_PARTNER_RENT: "border border-mint/40 bg-mintDim/50 text-mint",
};

const CITIES = ["Wrocław", "Warszawa", "Kraków", "Gdańsk", "Poznań", "Katowice", "Łódź", "Praha"];

type ReferredRow = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  invitationType: InvitationType;
  status: ReferredStatus;
  city: string;
  link: string | null;
  ambassadorId: string | null;
  ambassadorName: string | null;
  vehicles: ReferredVehicle[];
  payouts: Payout[];
  payoutTotal: number;
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
  { bg: "bg-coralDim/70", text: "text-coral" },
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

function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
      <path d="M13 2 3 14h6l-1 8 11-14h-7l1-6Z" />
    </svg>
  );
}

function BikeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="17" r="3.2" />
      <circle cx="18" cy="17" r="3.2" />
      <path d="M6 17 10 8h4l4 9M10 8 8.5 5H6M13 12h4" />
    </svg>
  );
}

function UsersDuoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17.5" cy="8.5" r="2.4" />
      <path d="M15.5 14.3c2.6.4 4.5 2.6 4.5 5.7" />
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

function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7 9 5-5 5 5M7 15l5 5 5-5" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
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

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.7 4.5 5.7v5.4c0 4.8 3.2 7.8 7.5 9.9 4.3-2.1 7.5-5.1 7.5-9.9V5.7Z" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 4h6v6M20 4 10 14M9 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

// Позволяет вставлять ссылку без "https://" — при открытии добавляем схему сами
function normalizeUrl(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function LinkCell({
  row,
  editable,
  onSaved,
}: {
  row: ReferredRow;
  editable: boolean;
  onSaved: (link: string | null) => void;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState(row.link ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    const original = row.link ?? "";
    if (value === original) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/referred-clients/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link: value }),
      });
      if (res.ok) {
        const normalized = value.trim() || null;
        onSaved(normalized);
        setValue(normalized ?? "");
      }
    } finally {
      setSaving(false);
    }
  }

  if (!editable) {
    return row.link ? (
      <a
        href={normalizeUrl(row.link)}
        target="_blank"
        rel="noopener noreferrer"
        title={t("link_open")}
        className="inline-flex items-center gap-1.5 text-violet transition-colors hover:opacity-80"
      >
        <ExternalLinkIcon />
        {t("link_open")}
      </a>
    ) : (
      <span className="text-faint">—</span>
    );
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
        placeholder={t("link_placeholder")}
        className="w-40 rounded-lg border border-line bg-bg2 px-2.5 py-1.5 text-xs text-ink outline-none transition-colors focus:border-violet/50"
      />
      {saving && <span className="shrink-0 text-[10px] text-faint">…</span>}
      {!saving && row.link && (
        <a
          href={normalizeUrl(row.link)}
          target="_blank"
          rel="noopener noreferrer"
          title={t("link_open")}
          onMouseDown={(e) => e.preventDefault()}
          className="shrink-0 text-muted transition-colors hover:text-violet"
        >
          <ExternalLinkIcon />
        </a>
      )}
    </div>
  );
}

function AmbassadorCell({
  row,
  ambassadors,
  editable,
  onSaved,
}: {
  row: ReferredRow;
  ambassadors: AmbassadorOption[];
  editable: boolean;
  onSaved: (ambassadorId: string | null, ambassadorName: string | null) => void;
}) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);

  if (!editable) {
    return row.ambassadorName ? (
      <span className="text-ink">{row.ambassadorName}</span>
    ) : (
      <span className="text-xs text-faint">{t("ambassador_unassigned")}</span>
    );
  }

  async function change(id: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/referred-clients/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ambassadorId: id || null }),
      });
      if (res.ok) {
        const name = ambassadors.find((a) => a.id === id)?.name ?? null;
        onSaved(id || null, name);
      }
    } finally {
      setSaving(false);
    }
  }

  // Если закреплённого пользователя уже нет среди амбассадоров (например, сменили роль) —
  // всё равно показываем его имя, чтобы значение не «пропадало»
  const orphan = row.ambassadorId && !ambassadors.some((a) => a.id === row.ambassadorId);

  return (
    <select
      value={row.ambassadorId ?? ""}
      disabled={saving}
      onChange={(e) => change(e.target.value)}
      className="w-40 rounded-lg border border-line bg-bg2 px-2.5 py-1.5 text-xs text-ink outline-none transition-colors focus:border-violet/50 disabled:opacity-50"
    >
      <option value="">{t("ambassador_none_option")}</option>
      {orphan && <option value={row.ambassadorId!}>{row.ambassadorName ?? row.ambassadorId}</option>}
      {ambassadors.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name}
        </option>
      ))}
    </select>
  );
}

function StatusCell({
  row,
  editable,
  onSaved,
}: {
  row: ReferredRow;
  editable: boolean;
  onSaved: (status: ReferredStatus) => void;
}) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);

  const pill = (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-medium ${STATUS_STYLE[row.status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {t(STATUS_LABEL_KEYS[row.status])}
    </span>
  );

  if (!editable) return pill;

  async function change(status: ReferredStatus) {
    if (status === row.status) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/referred-clients/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) onSaved(status);
    } finally {
      setSaving(false);
    }
  }

  // <select> поверх пилюли: выглядит как обычный статус, но кликабелен для тех, кому можно менять
  return (
    <div className="relative inline-flex">
      <select
        value={row.status}
        disabled={saving}
        onChange={(e) => change(e.target.value as ReferredStatus)}
        aria-label={t("col_status")}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0 disabled:cursor-wait"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {t(STATUS_LABEL_KEYS[s])}
          </option>
        ))}
      </select>
      {pill}
    </div>
  );
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export function ReferredClientsList({
  referred,
  role,
  ambassadors,
}: {
  referred: ReferredRow[];
  role: Role;
  ambassadors: AmbassadorOption[];
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const [rows, setRows] = useState<ReferredRow[]>(referred);
  const [query, setQuery] = useState("");
  // "all" — все, "none" — без амбассадора, иначе id выбранного амбассадора
  const [ambassadorFilter, setAmbassadorFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [invitationFilter, setInvitationFilter] = useState<"all" | InvitationType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ReferredStatus>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [payoutRowId, setPayoutRowId] = useState<string | null>(null);
  const [menuRowId, setMenuRowId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const editable = canEdit(role);
  const canDelete = isAdmin(role);
  // Добавлять клиентов может и амбассадор (они автоматически закрепляются за ним)
  const canAdd = editable || isAmbassador(role);
  // Амбассадор видит только своих клиентов — ему ни фильтр, ни колонка «Амбассадор» не нужны
  const showAmbassadors = !isAmbassador(role);
  // Ссылку заполняют сотрудники — амбассадору она не нужна, ему вместо неё показываем статус
  const showLink = !isAmbassador(role);
  const payoutRow = rows.find((r) => r.id === payoutRowId) || null;

  function updateRowPayouts(id: string, payouts: Payout[]) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, payouts, payoutTotal: payouts.reduce((s, p) => s + p.amount, 0) } : r
      )
    );
  }

  function updateRowLink(id: string, link: string | null) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, link } : r)));
  }

  function updateRowAmbassador(id: string, ambassadorId: string | null, ambassadorName: string | null) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ambassadorId, ambassadorName } : r)));
  }

  function updateRowStatus(id: string, status: ReferredStatus) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  const hasUnassigned = rows.some((r) => !r.ambassadorId);
  const cities = useMemo(() => Array.from(new Set(rows.map((r) => r.city))).sort(), [rows]);

  const filtersActive =
    query.trim() !== "" ||
    ambassadorFilter !== "all" ||
    cityFilter !== "all" ||
    invitationFilter !== "all" ||
    statusFilter !== "all";

  function resetFilters() {
    setQuery("");
    setAmbassadorFilter("all");
    setCityFilter("all");
    setInvitationFilter("all");
    setStatusFilter("all");
    setPage(1);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (showAmbassadors && ambassadorFilter !== "all") {
        if (ambassadorFilter === "none" ? r.ambassadorId : r.ambassadorId !== ambassadorFilter) return false;
      }
      if (cityFilter !== "all" && r.city !== cityFilter) return false;
      if (invitationFilter !== "all" && r.invitationType !== invitationFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      const haystack = `${r.firstName} ${r.lastName} ${r.phone} ${r.city} ${r.ambassadorName ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, query, ambassadorFilter, cityFilter, invitationFilter, statusFilter, showAmbassadors]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  async function deleteRow(id: string) {
    if (!confirm(t("delete_referred_confirm"))) return;
    const res = await fetch(`/api/referred-clients/${id}`, { method: "DELETE" });
    if (res.ok) {
      setRows((prev) => prev.filter((r) => r.id !== id));
      setMenuRowId(null);
      router.refresh();
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3.5">
          <span className="icon-tile mt-0.5 h-12 w-12 text-lg">
            <UsersDuoIcon />
          </span>
          <div>
            <h1 className="font-display text-[26px] font-semibold text-ink">{t("referred_title")}</h1>
            <p className="mt-1 text-sm text-muted">{t("referred_page_subtitle")}</p>
          </div>
        </div>
        {canAdd && (
          <button
            onClick={() => setFormOpen(true)}
            className="btn-primary whitespace-nowrap rounded-full px-5 py-3 text-sm"
          >
            <span className="text-base leading-none">+</span>
            {t("new_referred_btn")}
          </button>
        )}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint">
            <SearchIcon />
          </span>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder={t("referred_search_placeholder")}
            className="w-full rounded-xl border border-line bg-bg2 py-3 pl-11 pr-4 text-sm text-ink outline-none transition-colors focus:border-violet/50"
          />
        </div>

        <select
          value={cityFilter}
          onChange={(e) => {
            setCityFilter(e.target.value);
            setPage(1);
          }}
          aria-label={t("city_filter_label")}
          className="rounded-xl border border-line bg-bg2 px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-violet/50"
        >
          <option value="all">{t("city_filter_label")}</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={invitationFilter}
          onChange={(e) => {
            setInvitationFilter(e.target.value as "all" | InvitationType);
            setPage(1);
          }}
          aria-label={t("invitation_filter_label")}
          className="rounded-xl border border-line bg-bg2 px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-violet/50"
        >
          <option value="all">{t("invitation_filter_label")}</option>
          {INVITATION_TYPES.map((it) => (
            <option key={it} value={it}>
              {t(INVITATION_LABEL_KEYS[it])}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as "all" | ReferredStatus);
            setPage(1);
          }}
          aria-label={t("status_filter_label")}
          className="rounded-xl border border-line bg-bg2 px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-violet/50"
        >
          <option value="all">{t("status_filter_label")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(STATUS_LABEL_KEYS[s])}
            </option>
          ))}
        </select>

        {showAmbassadors && (
          <select
            value={ambassadorFilter}
            onChange={(e) => {
              setAmbassadorFilter(e.target.value);
              setPage(1);
            }}
            aria-label={t("ambassador_filter_label")}
            className="rounded-xl border border-line bg-bg2 px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-violet/50"
          >
            <option value="all">{t("ambassador_filter_all")}</option>
            {ambassadors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
            {hasUnassigned && <option value="none">{t("ambassador_filter_none")}</option>}
          </select>
        )}

        {filtersActive && (
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-line bg-bg2 px-4 py-3 text-sm text-muted transition-colors hover:border-violet/40 hover:text-violet"
          >
            <ResetIcon />
            {t("filters_reset")}
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="panel flex flex-col items-center gap-1 py-14 text-center">
          <div className="text-sm text-ink">{t("referred_empty_title")}</div>
          <div className="text-xs text-muted">{t("referred_empty_subtitle")}</div>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1220px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">
                    <span className="inline-flex items-center gap-1">{t("col_client")}<SortIcon /></span>
                  </th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">
                    <span className="inline-flex items-center gap-1">{t("col_client_phone")}<SortIcon /></span>
                  </th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">
                    <span className="inline-flex items-center gap-1">{t("col_invitation_type")}<SortIcon /></span>
                  </th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">
                    <span className="inline-flex items-center gap-1">{t("col_city")}<SortIcon /></span>
                  </th>
                  {showAmbassadors && (
                    <th className="px-5 py-3.5 text-xs font-medium text-muted">
                      <span className="inline-flex items-center gap-1">{t("col_ambassador")}<SortIcon /></span>
                    </th>
                  )}
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">
                    <span className="inline-flex items-center gap-1">{t("col_client_vehicle")}<SortIcon /></span>
                  </th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">
                    <span className="inline-flex items-center gap-1">{t("col_payout")}<SortIcon /></span>
                  </th>
                  {showLink && <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_link")}</th>}
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">
                    <span className="inline-flex items-center gap-1">{t("col_status")}<SortIcon /></span>
                  </th>
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
                        <a
                          href={`tel:${r.phone.replace(/\s+/g, "")}`}
                          className="inline-flex items-center gap-1.5 text-ink transition-colors hover:text-violet"
                        >
                          {r.phone}
                          <span className="text-faint"><PhoneIcon /></span>
                        </a>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${INVITATION_STYLE[r.invitationType]}`}>
                          {r.invitationType === "FLEET_PARTNER" ? <BoltIcon /> : <BikeIcon />}
                          {t(INVITATION_LABEL_KEYS[r.invitationType])}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-muted">{r.city}</td>
                      {showAmbassadors && (
                        <td className="px-5 py-3.5">
                          <AmbassadorCell
                            row={r}
                            ambassadors={ambassadors}
                            editable={editable}
                            onSaved={(id, name) => updateRowAmbassador(r.id, id, name)}
                          />
                        </td>
                      )}
                      <td className="px-5 py-3.5">
                        {r.vehicles.length === 0 ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-faint">
                            <BikeIcon />
                            {t("clients_not_renting")}
                          </span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan">
                              <BikeIcon />
                              {t("clients_renting")}
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {r.vehicles.map((v) => (
                                <span
                                  key={v.id}
                                  className="rounded-lg bg-violetDim/60 px-2.5 py-1 text-[12px] font-medium text-violet"
                                >
                                  {v.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => setPayoutRowId(r.id)}
                          className={
                            r.payoutTotal > 0
                              ? "whitespace-nowrap rounded-lg border border-mint/40 bg-mintDim/40 px-3 py-1.5 text-[12px] font-medium text-mint transition-opacity hover:opacity-80"
                              : "whitespace-nowrap rounded-lg border border-line bg-bg2 px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:border-violet/40 hover:text-violet"
                          }
                        >
                          {r.payoutTotal > 0 ? formatMoney(r.payoutTotal) : `+ ${t("payout_label")}`}
                        </button>
                      </td>
                      {showLink && (
                        <td className="px-5 py-3.5">
                          <LinkCell row={r} editable={editable} onSaved={(link) => updateRowLink(r.id, link)} />
                        </td>
                      )}
                      <td className="px-5 py-3.5">
                        <StatusCell row={r} editable={editable} onSaved={(status) => updateRowStatus(r.id, status)} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="relative">
                          <button
                            onClick={() => setMenuRowId(menuRowId === r.id ? null : r.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-violet/40 hover:text-violet"
                            aria-label={t("actions_label")}
                          >
                            <DotsIcon />
                          </button>
                          {menuRowId === r.id && (
                            <div className="panel absolute right-0 top-full z-20 mt-1.5 w-40 overflow-hidden p-1">
                              <button
                                onClick={() => {
                                  setPayoutRowId(r.id);
                                  setMenuRowId(null);
                                }}
                                className="block w-full rounded-lg px-3 py-2 text-left text-xs text-ink hover:bg-panel2/70"
                              >
                                {t("payout_label")}
                              </button>
                              {canDelete && (
                                <button
                                  onClick={() => deleteRow(r.id)}
                                  className="block w-full rounded-lg px-3 py-2 text-left text-xs text-danger hover:bg-danger/10"
                                >
                                  {t("delete_task_btn")}
                                </button>
                              )}
                            </div>
                          )}
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

      <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-faint">
        <ShieldIcon />
        {t("footer_security_note")}
      </div>

      {formOpen && (
        <NewReferredModal
          ambassadors={showAmbassadors ? ambassadors : null}
          onClose={() => setFormOpen(false)}
          onCreated={(row) => {
            setFormOpen(false);
            setRows((prev) => [row, ...prev]);
            router.refresh();
          }}
        />
      )}

      {payoutRow && (
        <PayoutModal
          row={payoutRow}
          editable={editable}
          canDelete={canDelete}
          onClose={() => setPayoutRowId(null)}
          onChange={(payouts) => updateRowPayouts(payoutRow.id, payouts)}
        />
      )}
    </div>
  );
}

function PayoutModal({
  row,
  editable,
  canDelete,
  onClose,
  onChange,
}: {
  row: ReferredRow;
  editable: boolean;
  canDelete: boolean;
  onClose: () => void;
  onChange: (payouts: Payout[]) => void;
}) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      setError(t("payout_amount_invalid"));
      return;
    }
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/referred-clients/${row.id}/payouts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: value, note: note.trim() || undefined }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || t("create_failed"));
      return;
    }
    const payout: Payout = await res.json();
    onChange([payout, ...row.payouts]);
    setAmount("");
    setNote("");
  }

  async function removePayout(id: string) {
    if (!confirm(t("delete_payout_confirm"))) return;
    const res = await fetch(`/api/referred-clients/${row.id}/payouts/${id}`, { method: "DELETE" });
    if (res.ok) {
      onChange(row.payouts.filter((p) => p.id !== id));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-sm px-4 py-8">
      <div className="panel w-full max-w-sm p-6 animate-rise">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">{t("payout_label")}</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            ✕
          </button>
        </div>
        <div className="mb-4 text-xs text-muted">
          {row.firstName} {row.lastName}
        </div>

        <div className="mb-4 flex items-center justify-between rounded-lg border border-mint/40 bg-mintDim/40 px-3 py-2">
          <span className="text-xs text-muted">{t("payout_total")}</span>
          <span className="font-display text-base font-semibold text-mint">{formatMoney(row.payoutTotal)}</span>
        </div>

        {row.payouts.length > 0 && (
          <div className="mb-4 max-h-48 space-y-1.5 overflow-y-auto">
            {row.payouts.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-line bg-bg2 px-3 py-2 text-xs"
              >
                <div>
                  <div className="text-ink">{formatMoney(p.amount)}</div>
                  {p.note && <div className="text-faint">{p.note}</div>}
                  <div className="text-faint">
                    {new Date(p.createdAt).toLocaleDateString()}
                    {p.createdByName ? ` · ${p.createdByName}` : ""}
                  </div>
                </div>
                {canDelete && (
                  <button
                    onClick={() => removePayout(p.id)}
                    className="text-danger hover:opacity-80"
                    title={t("delete_action")}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {editable && (
          <form onSubmit={submit}>
            <label className="mb-1 block label-eyebrow">{t("payout_amount_label")}</label>
            <input
              required
              autoFocus
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="mb-3 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-mint/50"
            />
            <label className="mb-1 block label-eyebrow">
              {t("payout_note_label")} <span className="text-faint">({t("optional")})</span>
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("payout_note_placeholder")}
              className="mb-3 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-mint/50"
            />

            {error && (
              <div className="mb-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg border border-mint/40 bg-mintDim/40 py-2.5 text-sm font-medium text-mint transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? t("saving") : t("payout_add_btn")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function NewReferredModal({
  ambassadors,
  onClose,
  onCreated,
}: {
  // null — выбор амбассадора не показываем (когда клиента добавляет сам амбассадор)
  ambassadors: AmbassadorOption[] | null;
  onClose: () => void;
  onCreated: (row: ReferredRow) => void;
}) {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [invitationType, setInvitationType] = useState<InvitationType>("FLEET_PARTNER");
  const [city, setCity] = useState(CITIES[0]);
  const [ambassadorId, setAmbassadorId] = useState("");
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
    const res = await fetch("/api/referred-clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, phone, invitationType, city, ambassadorId: ambassadors ? ambassadorId || null : undefined }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || t("create_failed"));
      return;
    }
    const row = await res.json();
    onCreated(row);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-sm px-4 py-8">
      <form onSubmit={submit} className="panel w-full max-w-sm p-6 animate-rise">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">{t("new_referred_title")}</h2>
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
              className="w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-violet/50"
            />
          </div>
          <div>
            <label className="mb-1 block label-eyebrow">{t("field_renter_last_name")}</label>
            <input
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={t("renter_last_name_placeholder")}
              className="w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-violet/50"
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
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-violet/50"
        />

        <label className="mb-1 block label-eyebrow">{t("field_invitation_type")}</label>
        <select
          value={invitationType}
          onChange={(e) => setInvitationType(e.target.value as InvitationType)}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-violet/50"
        >
          {INVITATION_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(INVITATION_LABEL_KEYS[type])}
            </option>
          ))}
        </select>

        <label className="mb-1 block label-eyebrow">{t("field_city")}</label>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-violet/50"
        >
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {ambassadors && (
          <>
            <label className="mb-1 block label-eyebrow">
              {t("field_ambassador")} <span className="text-faint">({t("optional")})</span>
            </label>
            <select
              value={ambassadorId}
              onChange={(e) => setAmbassadorId(e.target.value)}
              className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-violet/50"
            >
              <option value="">{t("ambassador_none_option")}</option>
              {ambassadors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-violet py-2.5 text-sm font-medium text-white shadow-glowViolet transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? t("creating") : t("create")}
        </button>
      </form>
    </div>
  );
}
