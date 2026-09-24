import { prisma } from "@/lib/prisma";
import type { NotificationType, Role } from "@prisma/client";

// Роли, которые проверяют отчёты/планы амбассадоров (см. canReviewReports в roles.ts).
// Именно им уходит уведомление, когда амбассадор отправляет новый отчёт или план.
const REVIEWER_ROLES: Role[] = ["ADMIN", "DIRECTOR", "PR_MANAGER"];

type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
};

// Создать одно уведомление. Ошибки намеренно проглатываются (best-effort) —
// не хотим, чтобы падение уведомления сломало создание задачи/отчёта/плана.
export async function createNotification(input: CreateNotificationInput) {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
      },
    });
  } catch (err) {
    console.error("createNotification failed", err);
  }
}

// Создать одинаковое уведомление сразу нескольким пользователям (дубликаты userId убираются).
export async function createNotifications(
  userIds: string[],
  input: Omit<CreateNotificationInput, "userId">
) {
  const ids = Array.from(new Set(userIds)).filter(Boolean);
  if (ids.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: ids.map((userId) => ({
        userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
      })),
    });
  } catch (err) {
    console.error("createNotifications failed", err);
  }
}

// Уведомить всех проверяющих (PR-менеджер, директор, администратор), кроме отправителя —
// используется, когда амбассадор отправляет отчёт или план на проверку.
export async function notifyReviewers(
  excludeUserId: string,
  input: Omit<CreateNotificationInput, "userId">
) {
  const reviewers = await prisma.user.findMany({
    where: { role: { in: REVIEWER_ROLES }, id: { not: excludeUserId } },
    select: { id: true },
  });
  await createNotifications(
    reviewers.map((r) => r.id),
    input
  );
}
