// Планы на день: общие типы и чистые функции (без базы) — для сервера и браузера.
export const PLAN_STATUSES = ["PENDING", "APPROVED", "REJECTED", "SUGGESTION"] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const PLAN_MAX_LENGTH = 3000;

export type PlanRow = {
  id: string;
  authorId: string;
  authorName: string;
  planDate: string; // ISO, полночь UTC выбранной даты
  description: string;
  plannedHours: number;
  reviewStatus: PlanStatus;
  reviewComment: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

type PlanLike = {
  id: string;
  authorId: string;
  planDate: Date;
  description: string;
  plannedHours: number;
  reviewStatus: PlanStatus;
  reviewComment: string | null;
  reviewedByName: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  author: { name: string };
};

export function toPlanRow(p: PlanLike): PlanRow {
  return {
    id: p.id,
    authorId: p.authorId,
    authorName: p.author.name,
    planDate: p.planDate.toISOString(),
    description: p.description,
    plannedHours: p.plannedHours,
    reviewStatus: p.reviewStatus,
    reviewComment: p.reviewComment,
    reviewedByName: p.reviewedByName,
    reviewedAt: p.reviewedAt ? p.reviewedAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
  };
}

export type PlanInput = { planDate: Date; description: string; plannedHours: number };

// Проверка тела запроса при создании и исправлении плана
export function parsePlanInput(
  body: Record<string, unknown>
): { ok: true; data: PlanInput } | { ok: false; error: string } {
  const dateStr = typeof body.planDate === "string" ? body.planDate : "";
  const planDate = new Date(dateStr);
  if (!/^\d{4}-\d{2}-\d{2}/.test(dateStr) || Number.isNaN(planDate.getTime())) {
    return { ok: false, error: "Укажите дату, на которую построен план" };
  }

  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!description) return { ok: false, error: "Опишите планы" };
  if (description.length > PLAN_MAX_LENGTH) return { ok: false, error: "Слишком длинное описание плана" };

  const hours = Math.round(Number(body.plannedHours) * 10) / 10;
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
    return { ok: false, error: "Укажите, сколько часов планируете работать (от 0,1 до 24)" };
  }

  return { ok: true, data: { planDate, description, plannedHours: hours } };
}
