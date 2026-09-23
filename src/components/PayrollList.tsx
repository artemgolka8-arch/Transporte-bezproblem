"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ROLE_LABEL_KEYS, Role } from "@/lib/roles";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import type { Lang, TranslationKey } from "@/lib/i18n/translations";
import {
  PAYROLL_KINDS,
  PAYROLL_METHODS,
  type PayrollKind,
  type PayrollMethod,
  type PayrollRow,
} from "@/lib/payroll";

type Recipient = { id: string; name: string; role: Role };

const LOCALE_MAP: Record<Lang, string> = { ru: "ru-RU", pl: "pl-PL", uk: "uk-UA" };
const OTHER = "__other__";
const PAGE_SIZE = 15;

const KIND_LABEL_KEYS: Record<PayrollKind, TranslationKey> = {
  SALARY: "payroll_kind_salary",
  BONUS: "payroll_kind_bonus",
  ADVANCE: "payroll_kind_advance",
  OTHER: "payroll_kind_other",
};
const KIND_STYLE: Record<PayrollKind, string> = {
  SALARY: "border border-cyan/35 bg-cyanDim/60 text-cyan",
  BONUS: "border border-mint/35 bg-mintDim/60 text-mint",
  ADVANCE: "border border-amber/35 bg-amberDim/60 text-amber",
  OTHER: "border border-line bg-panel2/70 text-muted",
};
const METHOD_LABEL_KEYS: Record<PayrollMethod, TranslationKey> = {
  BANK_ACCOUNT: "payroll_method_bank",
  CARD: "payroll_method_card",
  CASH: "payroll_method_cash",
};

const AVATAR_PALETTE = [
  { bg: "bg-mintDim/70", text: "text-mint" },
  { bg: "bg-cyanDim/70", text: "text-cyan" },
  { bg: "bg-violetDim/70", text: "text-violet" },
  { bg: "bg-amberDim/70", text: "text-amber" },
  { bg: "bg-coralDim/70", text: "text-coral" },
];

function avatarStyle(seed: string) {
  return AVATAR_PALETTE[(seed.charCodeAt(0) || 0) % AVATAR_PALETTE.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatMoney(value: number, lang: Lang) {
  return `${value.toLocaleString(LOCALE_MAP[lang], { maximumFractionDigits: 2 })}\u00A0zł`;
}

// paidAt хранится как полночь UTC выбранной даты — показываем в UTC, чтобы дата не «съезжала»
function formatDate(iso: string, lang: Lang) {
  return new Date(iso).toLocaleDateString(LOCALE_MAP[lang], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/* ── иконки ─────────────────────────────────────────────── */

function Svg({ children, size = 16 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

function WalletIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg size={size}>
      <rect x="3" y="6.5" width="18" height="11" rx="2" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M6.5 9.5v.01M17.5 14.5v.01" />
    </Svg>
  );
}
function SearchIcon() {
  return (
    <Svg>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </Svg>
  );
}
function BankIcon({ size = 14 }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M3 9.5 12 4l9 5.5" />
      <path d="M5.5 10v7M10 10v7M14 10v7M18.5 10v7M3.5 20h17" />
    </Svg>
  );
}
function CardIcon({ size = 14 }: { size?: number }) {
  return (
    <Svg size={size}>
      <rect x="3" y="5.5" width="18" height="13" rx="2.2" />
      <path d="M3 10h18M7 15h3" />
    </Svg>
  );
}
function CashIcon({ size = 14 }: { size?: number }) {
  return (
    <Svg size={size}>
      <rect x="2.5" y="6.5" width="19" height="11" rx="2" />
      <circle cx="12" cy="12" r="2.4" />
      <path d="M6 10v.01M18 14v.01" />
    </Svg>
  );
}
function SumIcon() {
  return (
    <Svg size={18}>
      <path d="M18 5H7l5.5 7L7 19h11" />
    </Svg>
  );
}
function StarIcon() {
  return (
    <Svg size={18}>
      <path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.3 7.2 18.9l.9-5.4L4.2 9.7l5.4-.8L12 4Z" />
    </Svg>
  );
}
function UserIcon() {
  return (
    <Svg size={18}>
      <circle cx="12" cy="8.5" r="3.4" />
      <path d="M5 19.5c0-3.5 3.1-6 7-6s7 2.5 7 6" />
    </Svg>
  );
}

const METHOD_ICON: Record<PayrollMethod, (p: { size?: number }) => JSX.Element> = {
  BANK_ACCOUNT: BankIcon,
  CARD: CardIcon,
  CASH: CashIcon,
};

/* ── основной список ────────────────────────────────────── */

export function PayrollList({ rows: initialRows, recipients }: { rows: PayrollRow[]; recipients: Recipient[] }) {
  const router = useRouter();
  const { t, lang } = useTranslation();
  const [rows, setRows] = useState<PayrollRow[]>(initialRows);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<PayrollKind | "ALL">("ALL");
  const [methodFilter, setMethodFilter] = useState<PayrollMethod | "ALL">("ALL");
  const [month, setMonth] = useState(""); // "" — за всё время, иначе "YYYY-MM"
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<{ row: PayrollRow | null } | null>(null);

  // Итоги считаем по выбранному периоду (не по типу/способу), чтобы карточки
  // «Зарплаты» / «Бонусы» / «Наличными» не обнулялись при включении фильтра.
  const periodRows = useMemo(
    () => (month ? rows.filter((r) => r.paidAt.slice(0, 7) === month) : rows),
    [rows, month]
  );
  const stats = useMemo(() => {
    const sum = (list: PayrollRow[]) => list.reduce((acc, r) => acc + r.amount, 0);
    const total = sum(periodRows);
    const cash = periodRows.filter((r) => r.method === "CASH");
    return {
      total,
      count: periodRows.length,
      salary: sum(periodRows.filter((r) => r.kind === "SALARY")),
      salaryCount: periodRows.filter((r) => r.kind === "SALARY").length,
      bonus: sum(periodRows.filter((r) => r.kind === "BONUS")),
      bonusCount: periodRows.filter((r) => r.kind === "BONUS").length,
      cash: sum(cash),
      cashShare: total > 0 ? Math.round((sum(cash) / total) * 100) : 0,
    };
  }, [periodRows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return periodRows.filter((r) => {
      if (kindFilter !== "ALL" && r.kind !== kindFilter) return false;
      if (methodFilter !== "ALL" && r.method !== methodFilter) return false;
      if (!q) return true;
      return `${r.recipientName} ${r.description} ${r.accountNumber ?? ""}`.toLowerCase().includes(q);
    });
  }, [periodRows, query, kindFilter, methodFilter]);

  const filteredTotal = useMemo(() => filtered.reduce((acc, r) => acc + r.amount, 0), [filtered]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const filtersActive = query.trim() !== "" || kindFilter !== "ALL" || methodFilter !== "ALL" || month !== "";

  function resetFilters() {
    setQuery("");
    setKindFilter("ALL");
    setMethodFilter("ALL");
    setMonth("");
    setPage(1);
  }

  function currentMonth() {
    return todayISO().slice(0, 7);
  }

  function onSaved(row: PayrollRow) {
    setRows((prev) => {
      const exists = prev.some((r) => r.id === row.id);
      const next = exists ? prev.map((r) => (r.id === row.id ? row : r)) : [row, ...prev];
      return next.sort((a, b) => (a.paidAt === b.paidAt ? b.createdAt.localeCompare(a.createdAt) : b.paidAt.localeCompare(a.paidAt)));
    });
    setModal(null);
    router.refresh();
  }

  function onDeleted(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
    setModal(null);
    router.refresh();
  }

  const chip = (active: boolean) =>
    `inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
      active
        ? "border-cyan/40 bg-cyanDim/50 text-cyan"
        : "border-line bg-bg2 text-muted hover:border-cyan/30 hover:text-ink"
    }`;

  const statCards: {
    key: string;
    label: TranslationKey;
    value: number;
    sub: string;
    icon: JSX.Element;
    tone: string;
  }[] = [
    {
      key: "total",
      label: "payroll_stat_total",
      value: stats.total,
      sub: t("payroll_payments_count", { n: stats.count }),
      icon: <SumIcon />,
      tone: "bg-violetDim/70 text-violet",
    },
    {
      key: "salary",
      label: "payroll_stat_salary",
      value: stats.salary,
      sub: t("payroll_payments_count", { n: stats.salaryCount }),
      icon: <UserIcon />,
      tone: "bg-cyanDim/70 text-cyan",
    },
    {
      key: "bonus",
      label: "payroll_stat_bonus",
      value: stats.bonus,
      sub: t("payroll_payments_count", { n: stats.bonusCount }),
      icon: <StarIcon />,
      tone: "bg-mintDim/70 text-mint",
    },
    {
      key: "cash",
      label: "payroll_stat_cash",
      value: stats.cash,
      sub: t("payroll_cash_share", { n: stats.cashShare }),
      icon: <CashIcon size={18} />,
      tone: "bg-amberDim/70 text-amber",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      {/* шапка */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3.5">
          <span className="icon-tile mt-0.5 h-12 w-12 text-lg">
            <WalletIcon />
          </span>
          <div>
            <h1 className="font-display text-[26px] font-semibold text-ink">{t("payroll_title")}</h1>
            <p className="mt-1 text-sm text-muted">{t("payroll_page_subtitle")}</p>
          </div>
        </div>
        <button
          onClick={() => setModal({ row: null })}
          className="btn-primary whitespace-nowrap rounded-full px-5 py-3 text-sm"
        >
          <span className="text-base leading-none">+</span>
          {t("payroll_add_btn")}
        </button>
      </div>

      {/* итоги за период */}
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="label-eyebrow">
          {month ? t("payroll_stats_for_month", { month: monthLabel(month, lang) }) : t("payroll_stats_all_time")}
        </div>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((c) => (
          <div key={c.key} className="panel p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-medium text-muted">{t(c.label)}</div>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${c.tone}`}>{c.icon}</span>
            </div>
            <div className="mt-3 truncate font-display text-xl font-semibold text-ink sm:text-2xl">
              {formatMoney(c.value, lang)}
            </div>
            <div className="mt-1 text-xs text-faint">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* фильтры */}
      <div className="panel mb-5 space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
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
              placeholder={t("payroll_search_placeholder")}
              className="w-full rounded-xl border border-line bg-bg2 py-3 pl-11 pr-4 text-sm text-ink outline-none transition-colors focus:border-cyan/50"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setMonth("");
                setPage(1);
              }}
              className={chip(month === "")}
            >
              {t("payroll_all_time")}
            </button>
            <button
              onClick={() => {
                setMonth(currentMonth());
                setPage(1);
              }}
              className={chip(month !== "" && month === currentMonth())}
            >
              {t("payroll_this_month")}
            </button>
            <input
              type="month"
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                setPage(1);
              }}
              aria-label={t("payroll_month_label")}
              className="rounded-full border border-line bg-bg2 px-3.5 py-1.5 text-xs text-ink outline-none transition-colors focus:border-cyan/50"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="label-eyebrow mr-1">{t("payroll_field_kind")}</span>
            <button onClick={() => { setKindFilter("ALL"); setPage(1); }} className={chip(kindFilter === "ALL")}>
              {t("payroll_filter_all")}
            </button>
            {PAYROLL_KINDS.map((k) => (
              <button key={k} onClick={() => { setKindFilter(k); setPage(1); }} className={chip(kindFilter === k)}>
                {t(KIND_LABEL_KEYS[k])}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="label-eyebrow mr-1">{t("payroll_field_method")}</span>
            <button onClick={() => { setMethodFilter("ALL"); setPage(1); }} className={chip(methodFilter === "ALL")}>
              {t("payroll_filter_all")}
            </button>
            {PAYROLL_METHODS.map((m) => {
              const Icon = METHOD_ICON[m];
              return (
                <button key={m} onClick={() => { setMethodFilter(m); setPage(1); }} className={chip(methodFilter === m)}>
                  <Icon size={13} />
                  {t(METHOD_LABEL_KEYS[m])}
                </button>
              );
            })}
          </div>
          {filtersActive && (
            <button onClick={resetFilters} className="text-xs font-medium text-muted transition-colors hover:text-danger">
              {t("payroll_clear_filters")}
            </button>
          )}
        </div>
      </div>

      {/* таблица */}
      {rows.length === 0 ? (
        <div className="panel flex flex-col items-center gap-1 py-14 text-center">
          <div className="text-sm text-ink">{t("payroll_empty_title")}</div>
          <div className="text-xs text-muted">{t("payroll_empty_subtitle")}</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel flex flex-col items-center gap-1 py-14 text-center">
          <div className="text-sm text-ink">{t("payroll_no_results_title")}</div>
          <div className="text-xs text-muted">{t("payroll_no_results_subtitle")}</div>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_payroll_recipient")}</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_payroll_kind")}</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_payroll_amount")}</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_payroll_method")}</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_payroll_description")}</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_payroll_date")}</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r) => {
                  const avatar = avatarStyle(r.recipientName);
                  const MethodIcon = METHOD_ICON[r.method];
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setModal({ row: r })}
                      className="cursor-pointer border-b border-line/60 transition-colors last:border-0 hover:bg-panel2/40"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold ${avatar.bg} ${avatar.text}`}>
                            {r.avatarV && r.recipientId ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={`/api/team/${r.recipientId}/avatar?v=${r.avatarV}`}
                                alt=""
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              initials(r.recipientName)
                            )}
                          </span>
                          <div className="min-w-0 leading-tight">
                            <div className="truncate font-medium text-ink">{r.recipientName}</div>
                            <div className="truncate text-[11px] text-faint">
                              {r.recipientRole ? t(ROLE_LABEL_KEYS[r.recipientRole]) : t("payroll_external_recipient")}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${KIND_STYLE[r.kind]}`}>
                          {t(KIND_LABEL_KEYS[r.kind])}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 font-display text-[15px] font-semibold text-ink">
                        {formatMoney(r.amount, lang)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 text-ink">
                          <span className="text-faint"><MethodIcon size={15} /></span>
                          <div className="min-w-0 leading-tight">
                            <div className="whitespace-nowrap text-[13px]">{t(METHOD_LABEL_KEYS[r.method])}</div>
                            {r.accountNumber && (
                              <div className="max-w-[190px] truncate font-mono text-[11px] text-muted" title={r.accountNumber}>
                                {r.accountNumber}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="max-w-[260px] truncate text-[13px] text-muted" title={r.description}>
                          {r.description}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-[13px] text-ink">{formatDate(r.paidAt, lang)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3.5">
            <div className="text-xs text-muted">
              {t("payroll_total_label")}: {filtered.length} ·{" "}
              <span className="font-medium text-ink">{formatMoney(filteredTotal, lang)}</span>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-cyan/40 hover:text-cyan disabled:opacity-40"
                >
                  ‹
                </button>
                <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-cyan px-2 text-xs font-semibold text-white shadow-glowCyan">
                  {currentPage}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-cyan/40 hover:text-cyan disabled:opacity-40"
                >
                  ›
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {modal && (
        <PayrollModal
          key={modal.row?.id ?? "new"}
          recipients={recipients}
          initial={modal.row}
          onClose={() => setModal(null)}
          onSaved={onSaved}
          onDeleted={onDeleted}
        />
      )}
    </div>
  );
}

function monthLabel(month: string, lang: Lang) {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(LOCALE_MAP[lang], {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return label;
}

/* ── окно «Новая выплата» / редактирование ──────────────── */

function PayrollModal({
  recipients,
  initial,
  onClose,
  onSaved,
  onDeleted,
}: {
  recipients: Recipient[];
  initial: PayrollRow | null;
  onClose: () => void;
  onSaved: (row: PayrollRow) => void;
  onDeleted: (id: string) => void;
}) {
  const { t } = useTranslation();
  const editing = !!initial;

  const [recipientSel, setRecipientSel] = useState<string>(
    initial ? (initial.recipientId && recipients.some((r) => r.id === initial.recipientId) ? initial.recipientId : OTHER) : ""
  );
  const [manualName, setManualName] = useState(initial && !initial.recipientId ? initial.recipientName : "");
  const [kind, setKind] = useState<PayrollKind>(initial?.kind ?? "SALARY");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [method, setMethod] = useState<PayrollMethod>(initial?.method ?? "BANK_ACCOUNT");
  const [accountNumber, setAccountNumber] = useState(initial?.accountNumber ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [paidAt, setPaidAt] = useState(initial ? initial.paidAt.slice(0, 10) : todayISO());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const showAccount = method !== "CASH";
  const inputClass =
    "w-full rounded-lg border border-line bg-bg2 px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-cyan/50";
  const toggle = (active: boolean, style = "border-cyan/40 bg-cyanDim/50 text-cyan") =>
    `flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2.5 text-xs font-medium transition-colors ${
      active ? style : "border-line bg-bg2 text-muted hover:border-cyan/30 hover:text-ink"
    }`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const isOther = recipientSel === OTHER;
    if (!recipientSel || (isOther && !manualName.trim())) return setError(t("payroll_error_recipient"));
    const amountNum = Number(amount.replace(",", "."));
    if (!Number.isFinite(amountNum) || amountNum <= 0) return setError(t("payroll_error_amount"));
    if (method === "BANK_ACCOUNT" && !accountNumber.trim()) return setError(t("payroll_error_account"));
    if (!description.trim()) return setError(t("payroll_error_description"));

    setError(null);
    setLoading(true);
    const res = await fetch(editing ? `/api/payroll/${initial!.id}` : "/api/payroll", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientId: isOther ? null : recipientSel,
        recipientName: isOther ? manualName : "",
        kind,
        amount: amountNum,
        method,
        accountNumber: showAccount ? accountNumber : "",
        description,
        paidAt,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || t("payroll_save_failed"));
      return;
    }
    onSaved(await res.json());
  }

  async function remove() {
    if (!initial || !confirm(t("payroll_delete_confirm"))) return;
    setLoading(true);
    const res = await fetch(`/api/payroll/${initial.id}`, { method: "DELETE" });
    setLoading(false);
    if (res.ok) onDeleted(initial.id);
    else setError(t("payroll_save_failed"));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 px-4 py-8 backdrop-blur-sm"
      onClick={onClose}
    >
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="panel w-full max-w-lg animate-rise p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">
            {editing ? t("payroll_edit_title") : t("payroll_new_title")}
          </h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            ✕
          </button>
        </div>

        <label className="mb-1 block label-eyebrow">{t("payroll_field_recipient")}</label>
        <select
          value={recipientSel}
          onChange={(e) => setRecipientSel(e.target.value)}
          className={`${inputClass} ${recipientSel === OTHER ? "mb-2" : "mb-4"}`}
        >
          <option value="" disabled>
            {t("payroll_recipient_placeholder")}
          </option>
          {recipients.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} · {t(ROLE_LABEL_KEYS[r.role])}
            </option>
          ))}
          <option value={OTHER}>{t("payroll_recipient_other")}</option>
        </select>
        {recipientSel === OTHER && (
          <input
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            placeholder={t("payroll_recipient_manual_placeholder")}
            maxLength={120}
            className={`${inputClass} mb-4`}
          />
        )}

        <label className="mb-1.5 block label-eyebrow">{t("payroll_field_kind")}</label>
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PAYROLL_KINDS.map((k) => (
            <button key={k} type="button" onClick={() => setKind(k)} className={toggle(kind === k, KIND_STYLE[k])}>
              {t(KIND_LABEL_KEYS[k])}
            </button>
          ))}
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block label-eyebrow">{t("payroll_field_amount")}</label>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block label-eyebrow">{t("payroll_field_date")}</label>
            <input
              required
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <label className="mb-1.5 block label-eyebrow">{t("payroll_field_method")}</label>
        <div className={`grid grid-cols-3 gap-2 ${showAccount ? "mb-3" : "mb-4"}`}>
          {PAYROLL_METHODS.map((m) => {
            const Icon = METHOD_ICON[m];
            return (
              <button key={m} type="button" onClick={() => setMethod(m)} className={toggle(method === m)}>
                <Icon size={14} />
                {t(METHOD_LABEL_KEYS[m])}
              </button>
            );
          })}
        </div>
        {showAccount && (
          <div className="mb-4">
            <label className="mb-1 block label-eyebrow">
              {method === "CARD" ? t("payroll_field_card_number") : t("payroll_field_account_number")}
            </label>
            <input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder={method === "CARD" ? t("payroll_card_placeholder") : t("payroll_account_placeholder")}
              maxLength={64}
              className={`${inputClass} font-mono`}
            />
          </div>
        )}

        <label className="mb-1 block label-eyebrow">{t("payroll_field_description")}</label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("payroll_description_placeholder")}
          maxLength={500}
          className={`${inputClass} mb-4 resize-none`}
        />

        {error && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-sm">
          {loading ? t("saving") : editing ? t("save_changes") : t("payroll_submit_add")}
        </button>

        {editing && (
          <>
            <button
              type="button"
              onClick={remove}
              disabled={loading}
              className="mt-2.5 w-full rounded-lg border border-danger/30 bg-danger/10 py-2.5 text-sm font-medium text-danger transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {t("delete_action")}
            </button>
            {initial!.createdByName && (
              <div className="mt-3 text-center text-[11px] text-faint">
                {t("payroll_issued_by")}: {initial!.createdByName}
              </div>
            )}
          </>
        )}
      </form>
    </div>
  );
}
