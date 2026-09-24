"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { canDeleteAnyReport, canReviewReports, isAmbassador, Role } from "@/lib/roles";
import type { ReportRow, ReviewStatus } from "@/lib/reports";
import type { PlanRow } from "@/lib/plans";
import { PlansPanel } from "./PlansPanel";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { TranslationKey } from "@/lib/i18n/translations";

type ReportRating = "BAD" | "NORMAL" | "GREAT" | "EXCELLENT";

const RATINGS: ReportRating[] = ["BAD", "NORMAL", "GREAT", "EXCELLENT"];
const RATING_LABEL_KEYS: Record<ReportRating, TranslationKey> = {
  BAD: "rating_bad",
  NORMAL: "rating_normal",
  GREAT: "rating_great",
  EXCELLENT: "rating_excellent",
};
// Цвет пилюли самооценки — от тревожного к отличному результату
const RATING_STYLE: Record<ReportRating, string> = {
  BAD: "border border-coral/35 bg-coralDim/60 text-coral",
  NORMAL: "border border-amber/35 bg-amberDim/60 text-amber",
  GREAT: "border border-cyan/35 bg-cyanDim/60 text-cyan",
  EXCELLENT: "border border-mint/35 bg-mintDim/60 text-mint",
};

const REVIEW_STATUSES: ReviewStatus[] = ["PENDING", "APPROVED", "REJECTED"];
const REVIEW_LABEL_KEYS: Record<ReviewStatus, TranslationKey> = {
  PENDING: "report_status_pending",
  APPROVED: "report_status_approved",
  REJECTED: "report_status_rejected",
};
// Статус проверки: жёлтый — ждёт, зелёный — подтверждён, красный — не подтверждён
const REVIEW_STYLE: Record<ReviewStatus, string> = {
  PENDING: "border border-amber/35 bg-amberDim/60 text-amber",
  APPROVED: "border border-mint/35 bg-mintDim/60 text-mint",
  REJECTED: "border border-coral/35 bg-coralDim/60 text-coral",
};

function ReviewIcon({ status }: { status: ReviewStatus }) {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      {status === "APPROVED" && <path d="m5 12.5 4.5 4.5L19 7.5" />}
      {status === "REJECTED" && <path d="M6 6l12 12M18 6 6 18" />}
      {status === "PENDING" && (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </>
      )}
    </svg>
  );
}

function ReviewBadge({ status }: { status: ReviewStatus }) {
  const { t } = useTranslation();
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${REVIEW_STYLE[status]}`}>
      <ReviewIcon status={status} />
      {t(REVIEW_LABEL_KEYS[status])}
    </span>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="4.5" width="14" height="16" rx="2" />
      <path d="M9 3.5h6v3H9z" />
      <path d="M8.5 11.5h7M8.5 15h7M8.5 18h4" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
      <path d="M16.6 3.5c.6 1.9 2 3.2 4 3.5v3a7.3 7.3 0 0 1-4-1.3v6.4a5.9 5.9 0 1 1-5.9-5.9c.3 0 .6 0 .9.1v3.1a2.8 2.8 0 1 0 2 2.7V3.5h3Z" />
    </svg>
  );
}

function ReelsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <path d="M3.8 8.5h16.4M9 3.7l2.6 4.8M14.6 3.7l2.6 4.8" />
      <path d="m10.5 12.3 3.6 2.2-3.6 2.2Z" fill="currentColor" stroke="none" />
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

const PAGE_SIZE = 10;

export function ReportsList({
  reports,
  plans: initialPlans,
  role,
  currentUserId,
}: {
  reports: ReportRow[];
  plans: PlanRow[];
  role: Role;
  currentUserId: string;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const [rows, setRows] = useState<ReportRow[]>(reports);
  const [plans, setPlans] = useState<PlanRow[]>(initialPlans);
  const [tab, setTab] = useState<"reports" | "plans">("reports");
  const [planFormOpen, setPlanFormOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<ReportRow | null>(null);
  const [editRow, setEditRow] = useState<ReportRow | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | "ALL">("ALL");
  const [menuRowId, setMenuRowId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const ambassadorOnly = isAmbassador(role);
  const admin = canDeleteAnyReport(role);
  const canReview = canReviewReports(role);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "ALL" && r.reviewStatus !== statusFilter) return false;
      if (!q) return true;
      return `${r.authorName} ${r.description}`.toLowerCase().includes(q);
    });
  }, [rows, query, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<ReviewStatus, number> = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
    for (const r of rows) counts[r.reviewStatus] += 1;
    return counts;
  }, [rows]);

  const pendingReports = statusCounts.PENDING;
  const pendingPlans = useMemo(() => plans.filter((p) => p.reviewStatus === "PENDING").length, [plans]);

  function upsertPlan(row: PlanRow) {
    setPlans((prev) => (prev.some((p) => p.id === row.id) ? prev.map((p) => (p.id === row.id ? row : p)) : [row, ...prev]));
  }

  // Обновляет отчёт в списке (и в открытом окне) после проверки или исправления
  function upsertRow(row: ReportRow) {
    setRows((prev) => (prev.some((r) => r.id === row.id) ? prev.map((r) => (r.id === row.id ? row : r)) : [row, ...prev]));
    setDetailRow((prev) => (prev && prev.id === row.id ? row : prev));
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  async function deleteRow(id: string) {
    if (!confirm(t("delete_report_confirm"))) return;
    const res = await fetch(`/api/reports/${id}`, { method: "DELETE" });
    if (res.ok) {
      setRows((prev) => prev.filter((r) => r.id !== id));
      setMenuRowId(null);
      setDetailRow(null);
      router.refresh();
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3.5">
          <span className="icon-tile mt-0.5 h-12 w-12 text-lg">
            <ClipboardIcon />
          </span>
          <div>
            <h1 className="font-display text-[26px] font-semibold text-ink">{t("reports_title")}</h1>
            <p className="mt-1 text-sm text-muted">{t("reports_page_subtitle")}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setTab("plans");
              setPlanFormOpen(true);
            }}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-cyan/40 bg-cyanDim/40 px-5 py-3 text-sm font-medium text-cyan transition-colors hover:bg-cyanDim/70"
          >
            <span className="text-base leading-none">+</span>
            {t("add_plan_btn")}
          </button>
          <button
            onClick={() => setFormOpen(true)}
            className="btn-primary whitespace-nowrap rounded-full px-5 py-3 text-sm"
          >
            <span className="text-base leading-none">+</span>
            {t("new_report_btn")}
          </button>
        </div>
      </div>

      {/* переключатель «Отчёты / Планы» */}
      <div className="mb-5 inline-flex rounded-full border border-line bg-bg2 p-1">
        {(
          [
            { id: "reports", label: t("plans_tab_reports"), pending: pendingReports },
            { id: "plans", label: t("plans_tab_plans"), pending: pendingPlans },
          ] as const
        ).map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors ${
              tab === tb.id ? "bg-cyan text-white shadow-glowCyan" : "text-muted hover:text-ink"
            }`}
          >
            {tb.label}
            {canReview && tb.pending > 0 && (
              <span
                className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${
                  tab === tb.id ? "bg-white/25 text-white" : "bg-amberDim/70 text-amber"
                }`}
              >
                {tb.pending}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "reports" && (
        <>
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
            placeholder={t("reports_search_placeholder")}
            className="w-full rounded-xl border border-line bg-bg2 py-3 pl-11 pr-4 text-sm text-ink outline-none transition-colors focus:border-cyan/50"
          />
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {(["ALL", ...REVIEW_STATUSES] as const).map((st) => {
          const active = statusFilter === st;
          const count = st === "ALL" ? rows.length : statusCounts[st];
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
              {st === "ALL" ? t("report_filter_all") : t(REVIEW_LABEL_KEYS[st])}
              <span className={active ? "text-cyan/80" : "text-faint"}>{count}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="panel flex flex-col items-center gap-1 py-14 text-center">
          <div className="text-sm text-ink">{t("reports_empty_title")}</div>
          <div className="text-xs text-muted">{t("reports_empty_subtitle")}</div>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1380px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-muted">
                  {!ambassadorOnly && <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_report_author")}</th>}
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_report_date")}</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_report_hours")}</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_report_partner")}</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_report_rent")}</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_report_content")}</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_report_published")}</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_report_rating")}</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_report_status")}</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("actions_label")}</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r) => {
                  const avatar = avatarStyle(r.authorName);
                  const canDelete = admin || r.authorId === currentUserId;
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setDetailRow(r)}
                      className="cursor-pointer border-b border-line/60 transition-colors last:border-0 hover:bg-panel2/40"
                    >
                      {!ambassadorOnly && (
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatar.bg} ${avatar.text}`}>
                              {initials(r.authorName)}
                            </span>
                            <span className="font-medium text-ink">{r.authorName}</span>
                          </div>
                        </td>
                      )}
                      <td className="px-5 py-3.5 text-ink">{formatDate(r.date)}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-ink">
                          <ClockIcon />
                          {r.hoursWorked}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-muted">
                        {r.partnerVisits} {t("report_visits_label")} · {r.partnerLeads} {t("report_leads_label")}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-muted">
                        {r.rentVisits} {t("report_visits_label")} · {r.rentLeads} {t("report_leads_label")}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-violet/40 bg-violetDim/50 px-2.5 py-1 text-[11px] font-medium text-violet">
                          <TikTokIcon />
                          {r.tiktokVideos} / {r.stories}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-1 whitespace-nowrap text-xs">
                          <span className="inline-flex items-center gap-1.5 text-ink">
                            <ReelsIcon />
                            <span className="text-muted">Reels</span>
                            <span className="font-medium">{r.reelsPublished}</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-ink">
                            <TikTokIcon />
                            <span className="text-muted">TikTok</span>
                            <span className="font-medium">{r.tiktokPublished}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-medium ${RATING_STYLE[r.selfRating]}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {t(RATING_LABEL_KEYS[r.selfRating])}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <ReviewBadge status={r.reviewStatus} />
                      </td>
                      <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="relative">
                          <button
                            onClick={() => setMenuRowId(menuRowId === r.id ? null : r.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-cyan/40 hover:text-cyan"
                            aria-label={t("actions_label")}
                          >
                            <DotsIcon />
                          </button>
                          {menuRowId === r.id && (
                            <div className="panel absolute right-0 top-full z-20 mt-1.5 w-40 overflow-hidden p-1">
                              <button
                                onClick={() => {
                                  setDetailRow(r);
                                  setMenuRowId(null);
                                }}
                                className="block w-full rounded-lg px-3 py-2 text-left text-xs text-ink hover:bg-panel2/70"
                              >
                                {t("col_report_content")}
                              </button>
                              {canDelete && (
                                <button
                                  onClick={() => deleteRow(r.id)}
                                  className="block w-full rounded-lg px-3 py-2 text-left text-xs text-danger hover:bg-danger/10"
                                >
                                  {t("delete_action")}
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
              {t("total_reports_label")}: {filtered.length}
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
        </>
      )}

      {tab === "plans" && (
        <PlansPanel
          plans={plans}
          role={role}
          currentUserId={currentUserId}
          formOpen={planFormOpen}
          onFormClose={() => setPlanFormOpen(false)}
          onUpsert={upsertPlan}
          onRemove={(id) => setPlans((prev) => prev.filter((p) => p.id !== id))}
        />
      )}

      {(formOpen || editRow) && (
        <NewReportModal
          key={editRow?.id ?? "new"}
          initial={editRow}
          onClose={() => {
            setFormOpen(false);
            setEditRow(null);
          }}
          onSaved={(row) => {
            upsertRow(row);
            setFormOpen(false);
            setEditRow(null);
            router.refresh();
          }}
        />
      )}

      {detailRow && (
        <ReportDetailModal
          row={detailRow}
          canReview={canReview && detailRow.authorId !== currentUserId}
          isAuthor={detailRow.authorId === currentUserId}
          canDelete={admin || detailRow.authorId === currentUserId}
          onClose={() => setDetailRow(null)}
          onDelete={() => deleteRow(detailRow.id)}
          onUpdated={upsertRow}
          onEdit={() => {
            setEditRow(detailRow);
            setDetailRow(null);
          }}
        />
      )}
    </div>
  );
}

// Просмотр отчёта. Окно ограничено по высоте, а содержимое прокручивается внутри
// (с заметным ползунком), поэтому отчёт любой длины можно пролистать целиком.
// Шапка и нижняя панель с действиями остаются на месте.
function ReportDetailModal({
  row,
  canReview,
  isAuthor,
  canDelete,
  onClose,
  onDelete,
  onUpdated,
  onEdit,
}: {
  row: ReportRow;
  canReview: boolean;
  isAuthor: boolean;
  canDelete: boolean;
  onClose: () => void;
  onDelete: () => void;
  onUpdated: (row: ReportRow) => void;
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  const [rejecting, setRejecting] = useState(false);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function review(decision: "APPROVED" | "REJECTED") {
    if (decision === "REJECTED" && !comment.trim()) {
      setError(t("report_review_error_comment"));
      return;
    }
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/reports/${row.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, comment }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || t("report_review_failed"));
      return;
    }
    onUpdated(await res.json());
    setRejecting(false);
    setComment("");
  }

  const stat = (label: TranslationKey, value: React.ReactNode) => (
    <div className="rounded-lg border border-line bg-bg2 px-3 py-2">
      <div className="text-faint">{t(label)}</div>
      <div className="mt-0.5 font-medium text-ink">{value}</div>
    </div>
  );

  const showFooter = canReview || (isAuthor && row.reviewStatus === "REJECTED");

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
            <div className="text-xs text-muted">{formatDate(row.date)}</div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <ReviewBadge status={row.reviewStatus} />
            <button type="button" onClick={onClose} className="text-muted hover:text-ink">
              ✕
            </button>
          </div>
        </div>

        {/* прокручиваемое содержимое */}
        <div className="scrollbar-visible min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
          {row.reviewStatus === "REJECTED" && (
            <div className="mb-4 rounded-xl border border-coral/35 bg-coralDim/40 px-3.5 py-3">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-coral">
                {t("report_rejected_note_title")}
              </div>
              <p className="whitespace-pre-wrap break-words text-sm text-ink">{row.reviewComment}</p>
              {row.reviewedByName && row.reviewedAt && (
                <div className="mt-2 text-[11px] text-muted">
                  {t("report_review_by", { name: row.reviewedByName, date: formatDate(row.reviewedAt) })}
                </div>
              )}
              {isAuthor && <div className="mt-2 text-xs text-muted">{t("report_rejected_author_hint")}</div>}
            </div>
          )}
          {row.reviewStatus === "APPROVED" && row.reviewedByName && row.reviewedAt && (
            <div className="mb-4 rounded-xl border border-mint/35 bg-mintDim/40 px-3.5 py-2.5 text-xs text-muted">
              {t("report_review_by", { name: row.reviewedByName, date: formatDate(row.reviewedAt) })}
            </div>
          )}
          {row.reviewStatus === "PENDING" && (
            <div className="mb-4 rounded-xl border border-amber/30 bg-amberDim/30 px-3.5 py-2.5 text-xs text-muted">
              {t("report_pending_hint")}
            </div>
          )}

          <p className="mb-4 whitespace-pre-wrap break-words rounded-xl border border-line bg-bg2 px-3.5 py-3 text-sm text-ink">
            {row.description}
          </p>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            {stat("field_report_hours", row.hoursWorked)}
            <div className="rounded-lg border border-line bg-bg2 px-3 py-2">
              <div className="text-faint">{t("field_report_self_rating")}</div>
              <span className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${RATING_STYLE[row.selfRating]}`}>
                {t(RATING_LABEL_KEYS[row.selfRating])}
              </span>
            </div>
            {stat("field_report_partner_visits", row.partnerVisits)}
            {stat("field_report_rent_visits", row.rentVisits)}
            {stat("field_report_partner_leads", row.partnerLeads)}
            {stat("field_report_rent_leads", row.rentLeads)}
            {stat("field_report_tiktok_videos", row.tiktokVideos)}
            {stat("field_report_stories", row.stories)}
            {stat("field_report_reels_published", row.reelsPublished)}
            {stat("field_report_tiktok_published", row.tiktokPublished)}
          </div>

          {canDelete && (
            <button
              onClick={onDelete}
              className="mt-5 w-full rounded-lg border border-danger/30 bg-danger/10 py-2.5 text-sm font-medium text-danger transition-opacity hover:opacity-80"
            >
              {t("delete_action")}
            </button>
          )}
        </div>

        {/* действия: проверка (PR-менеджер / директор / администратор) или исправление (автор) */}
        {showFooter && (
          <div className="shrink-0 border-t border-line bg-panel px-6 py-4">
            {canReview && !rejecting && (
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => review("APPROVED")}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-mint/40 bg-mintDim/60 py-2.5 text-sm font-medium text-mint transition-opacity hover:opacity-80 disabled:opacity-50"
                >
                  <ReviewIcon status="APPROVED" />
                  {t("report_review_approve")}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setRejecting(true);
                    setError(null);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-coral/40 bg-coralDim/60 py-2.5 text-sm font-medium text-coral transition-opacity hover:opacity-80 disabled:opacity-50"
                >
                  <ReviewIcon status="REJECTED" />
                  {t("report_review_reject")}
                </button>
              </div>
            )}

            {canReview && rejecting && (
              <div>
                <label className="mb-1 block label-eyebrow">{t("report_review_comment_label")}</label>
                <textarea
                  autoFocus
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={1000}
                  placeholder={t("report_review_comment_placeholder")}
                  className="mb-3 w-full resize-none rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-coral/50"
                />
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setRejecting(false);
                      setError(null);
                    }}
                    className="rounded-lg border border-line py-2.5 text-sm font-medium text-muted transition-colors hover:text-ink disabled:opacity-50"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => review("REJECTED")}
                    className="rounded-lg border border-coral/40 bg-coral py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {t("report_review_send_reject")}
                  </button>
                </div>
              </div>
            )}

            {!canReview && isAuthor && row.reviewStatus === "REJECTED" && (
              <button type="button" onClick={onEdit} className="btn-primary w-full py-2.5 text-sm">
                {t("report_edit_btn")}
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

function todayISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset();
  return new Date(d.getTime() - tz * 60000).toISOString().slice(0, 10);
}

// Форма отчёта: создание нового и исправление не подтверждённого (initial)
function NewReportModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: ReportRow | null;
  onClose: () => void;
  onSaved: (row: ReportRow) => void;
}) {
  const { t } = useTranslation();
  const editing = !!initial;
  const num = (v?: number) => (initial && v !== undefined ? String(v) : "");
  const [date, setDate] = useState(initial ? initial.date.slice(0, 10) : todayISO());
  const [description, setDescription] = useState(initial?.description ?? "");
  const [hoursWorked, setHoursWorked] = useState(num(initial?.hoursWorked));
  const [partnerVisits, setPartnerVisits] = useState(num(initial?.partnerVisits));
  const [rentVisits, setRentVisits] = useState(num(initial?.rentVisits));
  const [partnerLeads, setPartnerLeads] = useState(num(initial?.partnerLeads));
  const [rentLeads, setRentLeads] = useState(num(initial?.rentLeads));
  const [tiktokVideos, setTiktokVideos] = useState(num(initial?.tiktokVideos));
  const [stories, setStories] = useState(num(initial?.stories));
  const [reelsPublished, setReelsPublished] = useState(num(initial?.reelsPublished));
  const [tiktokPublished, setTiktokPublished] = useState(num(initial?.tiktokPublished));
  const [selfRating, setSelfRating] = useState<ReportRating>(initial?.selfRating ?? "NORMAL");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) {
      setError(t("field_report_description"));
      return;
    }
    setError(null);
    setLoading(true);
    const res = await fetch(editing ? `/api/reports/${initial!.id}` : "/api/reports", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        description,
        hoursWorked,
        partnerVisits,
        rentVisits,
        partnerLeads,
        rentLeads,
        tiktokVideos,
        stories,
        reelsPublished,
        tiktokPublished,
        selfRating,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || t(editing ? "report_update_failed" : "report_create_failed"));
      return;
    }
    const row = await res.json();
    onSaved(row);
  }

  const numberField = (label: TranslationKey, value: string, setValue: (v: string) => void) => (
    <div>
      <label className="mb-1 block label-eyebrow">{t(label)}</label>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="0"
        className="w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center px-4 py-8">
      <form onSubmit={submit} className="panel w-full max-w-lg p-6 animate-rise">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">
            {editing ? t("edit_report_title") : t("new_report_title")}
          </h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            ✕
          </button>
        </div>

        <label className="mb-1 block label-eyebrow">{t("field_report_date")}</label>
        <input
          required
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        />

        <label className="mb-1 block label-eyebrow">{t("field_report_description")}</label>
        <textarea
          required
          autoFocus
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("report_description_placeholder")}
          className="mb-4 w-full resize-none rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        />

        <div className="mb-4 grid grid-cols-2 gap-3">
          {numberField("field_report_hours", hoursWorked, setHoursWorked)}
          {numberField("field_report_partner_visits", partnerVisits, setPartnerVisits)}
          {numberField("field_report_rent_visits", rentVisits, setRentVisits)}
          {numberField("field_report_partner_leads", partnerLeads, setPartnerLeads)}
          {numberField("field_report_rent_leads", rentLeads, setRentLeads)}
          {numberField("field_report_tiktok_videos", tiktokVideos, setTiktokVideos)}
          {numberField("field_report_stories", stories, setStories)}
          {numberField("field_report_reels_published", reelsPublished, setReelsPublished)}
          {numberField("field_report_tiktok_published", tiktokPublished, setTiktokPublished)}
        </div>

        <label className="mb-1.5 block label-eyebrow">{t("field_report_self_rating")}</label>
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {RATINGS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setSelfRating(r)}
              className={`rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors ${
                selfRating === r
                  ? RATING_STYLE[r]
                  : "border-line bg-bg2 text-muted hover:border-cyan/30 hover:text-ink"
              }`}
            >
              {t(RATING_LABEL_KEYS[r])}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-sm">
          {loading ? t("creating") : editing ? t("report_resubmit_btn") : t("create")}
        </button>
      </form>
      </div>
    </div>
  );
}
