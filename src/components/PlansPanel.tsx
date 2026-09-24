"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { canDeleteAnyReport, canReviewReports, isAmbassador, Role } from "@/lib/roles";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import type { Lang, TranslationKey } from "@/lib/i18n/translations";
import { PLAN_MAX_LENGTH, PLAN_STATUSES, type PlanRow, type PlanStatus } from "@/lib/plans";

const LOCALE_MAP: Record<Lang, string> = { ru: "ru-RU", pl: "pl-PL", uk: "uk-UA" };
const PAGE_SIZE = 10;

const STATUS_LABEL_KEYS: Record<PlanStatus, TranslationKey> = {
  PENDING: "plan_status_pending",
  APPROVED: "plan_status_approved",
  REJECTED: "plan_status_rejected",
  SUGGESTION: "plan_status_suggestion",
};
// жёлтый — ждёт проверки, зелёный — подтверждён, красный — не подтверждён, фиолетовый — есть предложения
const STATUS_STYLE: Record<PlanStatus, string> = {
  PENDING: "border border-amber/35 bg-amberDim/60 text-amber",
  APPROVED: "border border-mint/35 bg-mintDim/60 text-mint",
  REJECTED: "border border-coral/35 bg-coralDim/60 text-coral",
  SUGGESTION: "border border-violet/35 bg-violetDim/60 text-violet",
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

// Дата плана хранится как полночь UTC — показываем в UTC, чтобы день не «съезжал»
function formatPlanDate(iso: string, lang: Lang, withWeekday = false) {
  return new Date(iso).toLocaleDateString(LOCALE_MAP[lang], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withWeekday ? { weekday: "short" as const } : {}),
    timeZone: "UTC",
  });
}

function formatStamp(iso: string, lang: Lang) {
  return new Date(iso).toLocaleDateString(LOCALE_MAP[lang], { day: "2-digit", month: "2-digit", year: "numeric" });
}

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function formatHours(h: number) {
  return Number.isInteger(h) ? String(h) : h.toFixed(1);
}

/* ── иконки ─────────────────────────────────────────────── */

function StatusIcon({ status }: { status: PlanStatus }) {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      {status === "APPROVED" && <path d="m5 12.5 4.5 4.5L19 7.5" />}
      {status === "REJECTED" && <path d="M6 6l12 12M18 6 6 18" />}
      {status === "SUGGESTION" && <path d="M12 5v14M5 12h14" />}
      {status === "PENDING" && (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </>
      )}
    </svg>
  );
}

function StatusBadge({ status }: { status: PlanStatus }) {
  const { t } = useTranslation();
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLE[status]}`}>
      <StatusIcon status={status} />
      {t(STATUS_LABEL_KEYS[status])}
    </span>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

function CalendarIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}

function ClockIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

/* ── панель «Планы» ─────────────────────────────────────── */

export function PlansPanel({
  plans,
  role,
  currentUserId,
  formOpen,
  onFormClose,
  onUpsert,
  onRemove,
}: {
  plans: PlanRow[];
  role: Role;
  currentUserId: string;
  formOpen: boolean;
  onFormClose: () => void;
  onUpsert: (row: PlanRow) => void;
  onRemove: (id: string) => void;
}) {
  const router = useRouter();
  const { t, lang } = useTranslation();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PlanStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<PlanRow | null>(null);
  const ambassadorOnly = isAmbassador(role);

  const detail = detailId ? plans.find((p) => p.id === detailId) ?? null : null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return plans.filter((p) => {
      if (statusFilter !== "ALL" && p.reviewStatus !== statusFilter) return false;
      if (!q) return true;
      return `${p.authorName} ${p.description}`.toLowerCase().includes(q);
    });
  }, [plans, query, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<PlanStatus, number> = { PENDING: 0, APPROVED: 0, REJECTED: 0, SUGGESTION: 0 };
    for (const p of plans) counts[p.reviewStatus] += 1;
    return counts;
  }, [plans]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  async function deletePlan(id: string) {
    if (!confirm(t("delete_plan_confirm"))) return;
    const res = await fetch(`/api/plans/${id}`, { method: "DELETE" });
    if (res.ok) {
      onRemove(id);
      setDetailId(null);
      router.refresh();
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
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
            placeholder={t("plans_search_placeholder")}
            className="w-full rounded-xl border border-line bg-bg2 py-3 pl-11 pr-4 text-sm text-ink outline-none transition-colors focus:border-cyan/50"
          />
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {(["ALL", ...PLAN_STATUSES] as const).map((st) => {
          const active = statusFilter === st;
          const count = st === "ALL" ? plans.length : statusCounts[st];
          return (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "border-cyan/40 bg-cyanDim/50 text-cyan"
                  : "border-line bg-bg2 text-muted hover:border-cyan/30 hover:text-ink"
              }`}
            >
              {st === "ALL" ? t("report_filter_all") : t(STATUS_LABEL_KEYS[st])}
              <span className={active ? "text-cyan/80" : "text-faint"}>{count}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="panel flex flex-col items-center gap-1 py-14 text-center">
          <div className="text-sm text-ink">{t("plans_empty_title")}</div>
          <div className="text-xs text-muted">{t("plans_empty_subtitle")}</div>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-muted">
                  {!ambassadorOnly && <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_plan_author")}</th>}
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_plan_date")}</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_plan_hours")}</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_plan_text")}</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_plan_status")}</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((p) => {
                  const avatar = avatarStyle(p.authorName);
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setDetailId(p.id)}
                      className="cursor-pointer border-b border-line/60 transition-colors last:border-0 hover:bg-panel2/40"
                    >
                      {!ambassadorOnly && (
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatar.bg} ${avatar.text}`}>
                              {initials(p.authorName)}
                            </span>
                            <span className="font-medium text-ink">{p.authorName}</span>
                          </div>
                        </td>
                      )}
                      <td className="whitespace-nowrap px-5 py-3.5 text-ink">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="text-faint"><CalendarIcon size={14} /></span>
                          {formatPlanDate(p.planDate, lang, true)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-ink">
                          <span className="text-faint"><ClockIcon size={14} /></span>
                          {formatHours(p.plannedHours)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="max-w-[360px] truncate text-[13px] text-muted" title={p.description}>
                          {p.description}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={p.reviewStatus} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3.5">
              <button
                onClick={() => setPage((n) => Math.max(1, n - 1))}
                disabled={currentPage <= 1}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-cyan/40 hover:text-cyan disabled:opacity-40"
              >
                ‹
              </button>
              <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-cyan px-2 text-xs font-semibold text-white shadow-glowCyan">
                {currentPage}
              </span>
              <button
                onClick={() => setPage((n) => Math.min(totalPages, n + 1))}
                disabled={currentPage >= totalPages}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-cyan/40 hover:text-cyan disabled:opacity-40"
              >
                ›
              </button>
            </div>
          )}
        </div>
      )}

      {(formOpen || editRow) && (
        <PlanFormModal
          key={editRow?.id ?? "new"}
          initial={editRow}
          onClose={() => {
            onFormClose();
            setEditRow(null);
          }}
          onSaved={(row) => {
            onUpsert(row);
            onFormClose();
            setEditRow(null);
            router.refresh();
          }}
        />
      )}

      {detail && (
        <PlanDetailModal
          row={detail}
          canReview={canReviewReports(role) && detail.authorId !== currentUserId}
          isAuthor={detail.authorId === currentUserId}
          canDelete={canDeleteAnyReport(role) || detail.authorId === currentUserId}
          onClose={() => setDetailId(null)}
          onDelete={() => deletePlan(detail.id)}
          onUpdated={(row) => {
            onUpsert(row);
            router.refresh();
          }}
          onEdit={() => {
            setEditRow(detail);
            setDetailId(null);
          }}
        />
      )}
    </>
  );
}

/* ── просмотр плана (с прокруткой) и проверка ───────────── */

type ReviewMode = null | "reject" | "add";

function PlanDetailModal({
  row,
  canReview,
  isAuthor,
  canDelete,
  onClose,
  onDelete,
  onUpdated,
  onEdit,
}: {
  row: PlanRow;
  canReview: boolean;
  isAuthor: boolean;
  canDelete: boolean;
  onClose: () => void;
  onDelete: () => void;
  onUpdated: (row: PlanRow) => void;
  onEdit: () => void;
}) {
  const { t, lang } = useTranslation();
  const [mode, setMode] = useState<ReviewMode>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function review(decision: "APPROVED" | "REJECTED" | "SUGGESTION") {
    if (decision !== "APPROVED" && !comment.trim()) {
      setError(t(decision === "REJECTED" ? "plan_error_comment_reject" : "plan_error_comment_suggestion"));
      return;
    }
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/plans/${row.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, comment }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || t("plan_review_failed"));
      return;
    }
    onUpdated(await res.json());
    setMode(null);
    setComment("");
  }

  const canEditPlan = isAuthor && (row.reviewStatus === "REJECTED" || row.reviewStatus === "SUGGESTION");
  const showFooter = canReview || canEditPlan;
  const reviewedBy =
    row.reviewedByName && row.reviewedAt
      ? t("report_review_by", { name: row.reviewedByName, date: formatStamp(row.reviewedAt, lang) })
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-3 py-4 backdrop-blur-sm sm:px-4"
      onClick={onClose}
    >
      <div
        className="panel flex max-h-[calc(100dvh-2rem)] w-full max-w-lg animate-rise flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* шапка */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-6 py-4">
          <div className="min-w-0">
            <div className="truncate font-display text-lg font-semibold text-ink">{row.authorName}</div>
            <div className="text-xs text-muted">{t("plan_detail_subtitle", { date: formatPlanDate(row.planDate, lang) })}</div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <StatusBadge status={row.reviewStatus} />
            <button type="button" onClick={onClose} className="text-muted hover:text-ink">
              ✕
            </button>
          </div>
        </div>

        {/* прокручиваемое содержимое */}
        <div className="scrollbar-visible min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
          {row.reviewStatus === "REJECTED" && (
            <div className="mb-4 rounded-xl border border-coral/35 bg-coralDim/40 px-3.5 py-3">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-coral">{t("plan_note_rejected_title")}</div>
              <p className="whitespace-pre-wrap break-words text-sm text-ink">{row.reviewComment}</p>
              {reviewedBy && <div className="mt-2 text-[11px] text-muted">{reviewedBy}</div>}
              {isAuthor && <div className="mt-2 text-xs text-muted">{t("plan_rejected_author_hint")}</div>}
            </div>
          )}
          {row.reviewStatus === "SUGGESTION" && (
            <div className="mb-4 rounded-xl border border-violet/35 bg-violetDim/40 px-3.5 py-3">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-violet">{t("plan_note_suggestion_title")}</div>
              <p className="whitespace-pre-wrap break-words text-sm text-ink">{row.reviewComment}</p>
              {reviewedBy && <div className="mt-2 text-[11px] text-muted">{reviewedBy}</div>}
              {isAuthor && <div className="mt-2 text-xs text-muted">{t("plan_suggestion_author_hint")}</div>}
            </div>
          )}
          {row.reviewStatus === "APPROVED" && reviewedBy && (
            <div className="mb-4 rounded-xl border border-mint/35 bg-mintDim/40 px-3.5 py-2.5 text-xs text-muted">{reviewedBy}</div>
          )}
          {row.reviewStatus === "PENDING" && (
            <div className="mb-4 rounded-xl border border-amber/30 bg-amberDim/30 px-3.5 py-2.5 text-xs text-muted">
              {t("plan_pending_hint")}
            </div>
          )}

          <div className="mb-4 grid grid-cols-2 gap-2.5 text-xs">
            <div className="rounded-lg border border-line bg-bg2 px-3 py-2">
              <div className="flex items-center gap-1.5 text-faint">
                <CalendarIcon size={13} />
                {t("plan_field_date")}
              </div>
              <div className="mt-0.5 font-medium text-ink">{formatPlanDate(row.planDate, lang, true)}</div>
            </div>
            <div className="rounded-lg border border-line bg-bg2 px-3 py-2">
              <div className="flex items-center gap-1.5 text-faint">
                <ClockIcon size={13} />
                {t("col_plan_hours")}
              </div>
              <div className="mt-0.5 font-medium text-ink">{formatHours(row.plannedHours)}</div>
            </div>
          </div>

          <div className="mb-1.5 label-eyebrow">{t("plan_text_label")}</div>
          <p className="whitespace-pre-wrap break-words rounded-xl border border-line bg-bg2 px-3.5 py-3 text-sm leading-relaxed text-ink">
            {row.description}
          </p>

          {canDelete && (
            <button
              onClick={onDelete}
              className="mt-5 w-full rounded-lg border border-danger/30 bg-danger/10 py-2.5 text-sm font-medium text-danger transition-opacity hover:opacity-80"
            >
              {t("delete_action")}
            </button>
          )}
        </div>

        {/* действия: проверка плана или исправление (автор) */}
        {showFooter && (
          <div className="shrink-0 border-t border-line bg-panel px-6 py-4">
            {canReview && mode === null && (
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => review("APPROVED")}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-mint/40 bg-mintDim/60 px-2 py-2.5 text-[13px] font-medium text-mint transition-opacity hover:opacity-80 disabled:opacity-50"
                >
                  <StatusIcon status="APPROVED" />
                  {t("plan_review_approve")}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setMode("reject");
                    setError(null);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-coral/40 bg-coralDim/60 px-2 py-2.5 text-[13px] font-medium text-coral transition-opacity hover:opacity-80 disabled:opacity-50"
                >
                  <StatusIcon status="REJECTED" />
                  {t("plan_review_reject")}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setMode("add");
                    setError(null);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-violet/40 bg-violetDim/60 px-2 py-2.5 text-[13px] font-medium text-violet transition-opacity hover:opacity-80 disabled:opacity-50"
                >
                  <StatusIcon status="SUGGESTION" />
                  {t("plan_review_add")}
                </button>
              </div>
            )}

            {canReview && mode !== null && (
              <div>
                <label className="mb-1 block label-eyebrow">
                  {t(mode === "reject" ? "plan_reject_label" : "plan_add_label")}
                </label>
                <textarea
                  autoFocus
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={1000}
                  placeholder={t(mode === "reject" ? "plan_reject_placeholder" : "plan_add_placeholder")}
                  className={`mb-3 w-full resize-none rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none ${
                    mode === "reject" ? "focus:border-coral/50" : "focus:border-violet/50"
                  }`}
                />
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setMode(null);
                      setError(null);
                    }}
                    className="rounded-lg border border-line py-2.5 text-sm font-medium text-muted transition-colors hover:text-ink disabled:opacity-50"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => review(mode === "reject" ? "REJECTED" : "SUGGESTION")}
                    className={`rounded-lg py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 ${
                      mode === "reject" ? "bg-coral" : "bg-violet"
                    }`}
                  >
                    {t(mode === "reject" ? "plan_send_reject" : "plan_send_suggestion")}
                  </button>
                </div>
              </div>
            )}

            {!canReview && canEditPlan && (
              <button type="button" onClick={onEdit} className="btn-primary w-full py-2.5 text-sm">
                {t("plan_edit_btn")}
              </button>
            )}

            {error && (
              <div className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── форма «Добавить план» ──────────────────────────────── */

function PlanFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: PlanRow | null;
  onClose: () => void;
  onSaved: (row: PlanRow) => void;
}) {
  const { t } = useTranslation();
  const editing = !!initial;
  const [planDate, setPlanDate] = useState(initial ? initial.planDate.slice(0, 10) : tomorrowISO());
  const [plannedHours, setPlannedHours] = useState(initial ? String(initial.plannedHours) : "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const hours = Number(plannedHours.replace(",", "."));
    if (!description.trim()) return setError(t("plan_error_description"));
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24) return setError(t("plan_error_hours"));

    setError(null);
    setLoading(true);
    const res = await fetch(editing ? `/api/plans/${initial!.id}` : "/api/plans", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planDate, plannedHours: hours, description }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || t(editing ? "plan_update_failed" : "plan_create_failed"));
      return;
    }
    onSaved(await res.json());
  }

  const inputClass =
    "w-full rounded-lg border border-line bg-bg2 px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-cyan/50";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center px-4 py-8">
        <form onSubmit={submit} className="panel w-full max-w-lg animate-rise p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="icon-tile mt-0.5 h-10 w-10">
                <CalendarIcon size={18} />
              </span>
              <div>
                <h2 className="font-display text-lg font-semibold text-ink">
                  {editing ? t("edit_plan_title") : t("new_plan_title")}
                </h2>
                <p className="mt-0.5 text-xs text-muted">{t("plan_form_subtitle")}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="text-muted hover:text-ink">
              ✕
            </button>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block label-eyebrow">{t("plan_field_date")}</label>
              <input required type="date" value={planDate} onChange={(e) => setPlanDate(e.target.value)} className={inputClass} />
              <p className="mt-1 text-[11px] text-faint">{t("plan_date_hint")}</p>
            </div>
            <div>
              <label className="mb-1 block label-eyebrow">{t("plan_field_hours")}</label>
              <input
                type="number"
                inputMode="decimal"
                min={0.5}
                max={24}
                step="0.5"
                value={plannedHours}
                onChange={(e) => setPlannedHours(e.target.value)}
                placeholder="8"
                className={inputClass}
              />
            </div>
          </div>

          <div className="mb-1 flex items-center justify-between">
            <label className="label-eyebrow">{t("plan_field_description")}</label>
            <span className="text-[11px] text-faint">
              {description.length}/{PLAN_MAX_LENGTH}
            </span>
          </div>
          <textarea
            autoFocus
            rows={8}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={PLAN_MAX_LENGTH}
            placeholder={t("plan_description_placeholder")}
            className={`${inputClass} mb-4 resize-y leading-relaxed`}
          />

          {error && (
            <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-sm">
            {loading ? t("creating") : editing ? t("plan_resubmit_btn") : t("plan_submit_btn")}
          </button>
        </form>
      </div>
    </div>
  );
}
