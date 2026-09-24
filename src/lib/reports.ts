// Отчёты: общие типы и чистые функции (без базы) — для сервера и браузера.
export const REPORT_RATINGS = ["BAD", "NORMAL", "GREAT", "EXCELLENT"] as const;
export type ReportRating = (typeof REPORT_RATINGS)[number];

export const REVIEW_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

// Строка отчёта в том виде, в каком она уходит в браузер
export type ReportRow = {
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
  reelsPublished: number;
  tiktokPublished: number;
  selfRating: ReportRating;
  reviewStatus: ReviewStatus;
  reviewComment: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

type ReportLike = {
  id: string;
  authorId: string;
  date: Date;
  description: string;
  hoursWorked: number;
  partnerVisits: number;
  rentVisits: number;
  partnerLeads: number;
  rentLeads: number;
  tiktokVideos: number;
  stories: number;
  reelsPublished: number;
  tiktokPublished: number;
  selfRating: ReportRating;
  reviewStatus: ReviewStatus;
  reviewComment: string | null;
  reviewedByName: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  author: { name: string };
};

export function toReportRow(r: ReportLike): ReportRow {
  return {
    id: r.id,
    authorId: r.authorId,
    authorName: r.author.name,
    date: r.date.toISOString(),
    description: r.description,
    hoursWorked: r.hoursWorked,
    partnerVisits: r.partnerVisits,
    rentVisits: r.rentVisits,
    partnerLeads: r.partnerLeads,
    rentLeads: r.rentLeads,
    tiktokVideos: r.tiktokVideos,
    stories: r.stories,
    reelsPublished: r.reelsPublished,
    tiktokPublished: r.tiktokPublished,
    selfRating: r.selfRating,
    reviewStatus: r.reviewStatus,
    reviewComment: r.reviewComment,
    reviewedByName: r.reviewedByName,
    reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  };
}

export type ReportInput = {
  date: Date;
  description: string;
  hoursWorked: number;
  partnerVisits: number;
  rentVisits: number;
  partnerLeads: number;
  rentLeads: number;
  tiktokVideos: number;
  stories: number;
  reelsPublished: number;
  tiktokPublished: number;
  selfRating: ReportRating;
};

// Проверка тела запроса при создании и исправлении отчёта
export function parseReportInput(
  body: Record<string, unknown>
): { ok: true; data: ReportInput } | { ok: false; error: string } {
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!description) return { ok: false, error: "Опишите проделанную работу" };

  const date = new Date(body.date as string);
  if (!body.date || Number.isNaN(date.getTime())) return { ok: false, error: "Укажите дату отчёта" };

  if (!REPORT_RATINGS.includes(body.selfRating as ReportRating)) {
    return { ok: false, error: "Укажите оценку проделанной работы" };
  }

  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  const int = (v: unknown) => Math.round(num(v));

  return {
    ok: true,
    data: {
      date,
      description,
      hoursWorked: num(body.hoursWorked),
      partnerVisits: int(body.partnerVisits),
      rentVisits: int(body.rentVisits),
      partnerLeads: int(body.partnerLeads),
      rentLeads: int(body.rentLeads),
      tiktokVideos: int(body.tiktokVideos),
      stories: int(body.stories),
      reelsPublished: int(body.reelsPublished),
      tiktokPublished: int(body.tiktokPublished),
      selfRating: body.selfRating as ReportRating,
    },
  };
}
