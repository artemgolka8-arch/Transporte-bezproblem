"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { canDeleteAnyReport, isAmbassador, Role } from "@/lib/roles";
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

type ReportRow = {
  id: string;
  authorId: string;
  authorName: string;
  date: string;
  description: string;
  hoursWorked: number;
  partnerVisits: number;
  rentVisits: number;
  partnerLeads: number;
  rentLeads: number;
  tiktokVideos: number;
  stories: number;
  selfRating: ReportRating;
  createdAt: string;
};

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
  role,
  currentUserId,
}: {
  reports: ReportRow[];
  role: Role;
  currentUserId: string;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const [rows, setRows] = useState<ReportRow[]>(reports);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<ReportRow | null>(null);
  const [menuRowId, setMenuRowId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const ambassadorOnly = isAmbassador(role);
  const admin = canDeleteAnyReport(role);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r.authorName} ${r.description}`.toLowerCase().includes(q));
  }, [rows, query]);

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
        <button
          onClick={() => setFormOpen(true)}
          className="btn-primary whitespace-nowrap rounded-full px-5 py-3 text-sm"
        >
          <span className="text-base leading-none">+</span>
          {t("new_report_btn")}
        </button>
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
            placeholder={t("reports_search_placeholder")}
            className="w-full rounded-xl border border-line bg-bg2 py-3 pl-11 pr-4 text-sm text-ink outline-none transition-colors focus:border-cyan/50"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="panel flex flex-col items-center gap-1 py-14 text-center">
          <div className="text-sm text-ink">{t("reports_empty_title")}</div>
          <div className="text-xs text-muted">{t("reports_empty_subtitle")}</div>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-muted">
                  {!ambassadorOnly && <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_report_author")}</th>}
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_report_date")}</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_report_hours")}</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_report_partner")}</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_report_rent")}</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_report_content")}</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_report_rating")}</th>
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
                        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-medium ${RATING_STYLE[r.selfRating]}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {t(RATING_LABEL_KEYS[r.selfRating])}
                        </span>
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

      {formOpen && (
        <NewReportModal
          onClose={() => setFormOpen(false)}
          onCreated={(row) => {
            setFormOpen(false);
            setRows((prev) => [row, ...prev]);
            router.refresh();
          }}
        />
      )}

      {detailRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-sm px-4 py-8"
          onClick={() => setDetailRow(null)}
        >
          <div className="panel w-full max-w-md p-6 animate-rise" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="font-display text-lg font-semibold text-ink">{detailRow.authorName}</div>
                <div className="text-xs text-muted">{formatDate(detailRow.date)}</div>
              </div>
              <button type="button" onClick={() => setDetailRow(null)} className="text-muted hover:text-ink">
                ✕
              </button>
            </div>

            <p className="mb-4 whitespace-pre-wrap rounded-xl border border-line bg-bg2 px-3.5 py-3 text-sm text-ink">
              {detailRow.description}
            </p>

            <div className="mb-4 grid grid-cols-2 gap-2.5 text-xs">
              <div className="rounded-lg border border-line bg-bg2 px-3 py-2">
                <div className="text-faint">{t("field_report_hours")}</div>
                <div className="mt-0.5 font-medium text-ink">{detailRow.hoursWorked}</div>
              </div>
              <div className="rounded-lg border border-line bg-bg2 px-3 py-2">
                <div className="text-faint">{t("field_report_self_rating")}</div>
                <span className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${RATING_STYLE[detailRow.selfRating]}`}>
                  {t(RATING_LABEL_KEYS[detailRow.selfRating])}
                </span>
              </div>
              <div className="rounded-lg border border-line bg-bg2 px-3 py-2">
                <div className="text-faint">{t("field_report_partner_visits")}</div>
                <div className="mt-0.5 font-medium text-ink">{detailRow.partnerVisits}</div>
              </div>
              <div className="rounded-lg border border-line bg-bg2 px-3 py-2">
                <div className="text-faint">{t("field_report_rent_visits")}</div>
                <div className="mt-0.5 font-medium text-ink">{detailRow.rentVisits}</div>
              </div>
              <div className="rounded-lg border border-line bg-bg2 px-3 py-2">
                <div className="text-faint">{t("field_report_partner_leads")}</div>
                <div className="mt-0.5 font-medium text-ink">{detailRow.partnerLeads}</div>
              </div>
              <div className="rounded-lg border border-line bg-bg2 px-3 py-2">
                <div className="text-faint">{t("field_report_rent_leads")}</div>
                <div className="mt-0.5 font-medium text-ink">{detailRow.rentLeads}</div>
              </div>
              <div className="rounded-lg border border-line bg-bg2 px-3 py-2">
                <div className="text-faint">{t("field_report_tiktok_videos")}</div>
                <div className="mt-0.5 font-medium text-ink">{detailRow.tiktokVideos}</div>
              </div>
              <div className="rounded-lg border border-line bg-bg2 px-3 py-2">
                <div className="text-faint">{t("field_report_stories")}</div>
                <div className="mt-0.5 font-medium text-ink">{detailRow.stories}</div>
              </div>
            </div>

            {(admin || detailRow.authorId === currentUserId) && (
              <button
                onClick={() => deleteRow(detailRow.id)}
                className="w-full rounded-lg border border-danger/30 bg-danger/10 py-2.5 text-sm font-medium text-danger transition-opacity hover:opacity-80"
              >
                {t("delete_action")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function todayISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset();
  return new Date(d.getTime() - tz * 60000).toISOString().slice(0, 10);
}

function NewReportModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (row: ReportRow) => void;
}) {
  const { t } = useTranslation();
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState("");
  const [hoursWorked, setHoursWorked] = useState("");
  const [partnerVisits, setPartnerVisits] = useState("");
  const [rentVisits, setRentVisits] = useState("");
  const [partnerLeads, setPartnerLeads] = useState("");
  const [rentLeads, setRentLeads] = useState("");
  const [tiktokVideos, setTiktokVideos] = useState("");
  const [stories, setStories] = useState("");
  const [selfRating, setSelfRating] = useState<ReportRating>("NORMAL");
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
    const res = await fetch("/api/reports", {
      method: "POST",
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
        selfRating,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || t("report_create_failed"));
      return;
    }
    const row = await res.json();
    onCreated(row);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-sm px-4 py-8">
      <form onSubmit={submit} className="panel w-full max-w-lg p-6 animate-rise">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">{t("new_report_title")}</h2>
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
          {loading ? t("creating") : t("create")}
        </button>
      </form>
    </div>
  );
}
