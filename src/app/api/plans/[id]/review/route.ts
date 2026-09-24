import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canReviewReports } from "@/lib/roles";
import { toPlanRow } from "@/lib/plans";
import { createNotification } from "@/lib/notifications";

// Проверка плана: подтвердить (APPROVED), не подтвердить (REJECTED — с причиной)
// или добавить предложение (SUGGESTION — что изменить / добавить в плане).
// Доступно PR-менеджеру, директору и администратору; свой план проверять нельзя.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (!canReviewReports(session.user.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const plan = await prisma.plan.findUnique({ where: { id: params.id }, select: { id: true, authorId: true } });
  if (!plan) return NextResponse.json({ error: "План не найден" }, { status: 404 });
  if (plan.authorId === session.user.id) {
    return NextResponse.json({ error: "Свой план проверять нельзя" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const decision = body.decision;
  if (decision !== "APPROVED" && decision !== "REJECTED" && decision !== "SUGGESTION") {
    return NextResponse.json({ error: "Укажите решение" }, { status: 400 });
  }

  const comment = typeof body.comment === "string" ? body.comment.trim() : "";
  if (decision === "REJECTED" && !comment) {
    return NextResponse.json({ error: "Опишите, почему план не подтверждён" }, { status: 400 });
  }
  if (decision === "SUGGESTION" && !comment) {
    return NextResponse.json({ error: "Напишите, что нужно изменить или добавить" }, { status: 400 });
  }
  if (comment.length > 1000) {
    return NextResponse.json({ error: "Слишком длинный комментарий" }, { status: 400 });
  }

  const updated = await prisma.plan.update({
    where: { id: params.id },
    data: {
      reviewStatus: decision,
      reviewComment: decision === "APPROVED" ? null : comment,
      reviewedById: session.user.id,
      reviewedByName: session.user.name || session.user.email || null,
      reviewedAt: new Date(),
    },
    include: { author: { select: { id: true, name: true } } },
  });

  // Уведомляем автора плана о результате проверки
  const reviewTitle =
    decision === "APPROVED" ? "План подтверждён" : decision === "REJECTED" ? "План не подтверждён" : "Есть предложение по плану";
  await createNotification({
    userId: plan.authorId,
    type: "PLAN_REVIEWED",
    title: reviewTitle,
    body: decision === "APPROVED" ? null : comment,
    link: "/reports",
  });

  return NextResponse.json(toPlanRow(updated));
}
