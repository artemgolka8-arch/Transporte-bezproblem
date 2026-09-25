import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canDeleteAnyReport, canReviewReports } from "@/lib/roles";
import { parsePlanInput, toPlanRow } from "@/lib/plans";
import { createNotification } from "@/lib/notifications";
import { sendSms } from "@/lib/notify";

// Правка плана.
// — Автор может исправить свой план, но только пока он REJECTED или SUGGESTION;
//   после исправления план снова уходит на проверку (reviewStatus = PENDING).
// — PR-менеджер / директор / администратор может сам отредактировать текст плана
//   амбассадора в любом статусе (не трогая при этом статус проверки); амбассадору
//   при этом уходит SMS о том, что план изменён, с новым текстом.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const plan = await prisma.plan.findUnique({
    where: { id: params.id },
    include: { author: { select: { id: true, name: true, phone: true } } },
  });
  if (!plan) return NextResponse.json({ error: "План не найден" }, { status: 404 });

  const isAuthor = plan.authorId === session.user.id;
  const isReviewer = canReviewReports(session.user.role) && !isAuthor;

  if (!isAuthor && !isReviewer) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  if (isAuthor && plan.reviewStatus !== "REJECTED" && plan.reviewStatus !== "SUGGESTION") {
    return NextResponse.json({ error: "Этот план сейчас исправлять нельзя" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = parsePlanInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const updated = await prisma.plan.update({
    where: { id: params.id },
    data: isAuthor
      ? {
          ...parsed.data,
          reviewStatus: "PENDING",
          reviewComment: null,
          reviewedById: null,
          reviewedByName: null,
          reviewedAt: null,
        }
      : parsed.data,
    include: { author: { select: { id: true, name: true } } },
  });

  if (isReviewer) {
    // Уведомление в колокольчик
    await createNotification({
      userId: plan.authorId,
      type: "PLAN_EDITED",
      title: "Ваш план изменён",
      body: parsed.data.description,
      link: "/reports",
    });

    // SMS амбассадору с новым текстом плана (если указан номер телефона)
    let smsSent = false;
    let smsError: string | null = null;
    const phone = plan.author.phone?.trim();
    if (phone) {
      const editorName = session.user.name || session.user.email || "Менеджер";
      const shortDescription =
        parsed.data.description.length > 400
          ? `${parsed.data.description.slice(0, 400)}…`
          : parsed.data.description;
      const text = `BezProblem: ваш план изменён (${editorName}). Новый план: ${shortDescription}`;
      try {
        await sendSms(phone, text);
        smsSent = true;
      } catch (err: any) {
        smsError = err?.message ? String(err.message) : "Не удалось отправить SMS";
        console.error("plan edit sms failed", smsError);
      }
    } else {
      smsError = "У амбассадора не указан телефон";
    }
    return NextResponse.json({ ...toPlanRow(updated), smsSent, smsError });
  }

  return NextResponse.json(toPlanRow(updated));
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const plan = await prisma.plan.findUnique({ where: { id: params.id }, select: { authorId: true } });
  if (!plan) return NextResponse.json({ error: "План не найден" }, { status: 404 });

  // Удалить может админ / PR-менеджер (как и отчёты) либо сам автор плана
  if (!canDeleteAnyReport(session.user.role) && plan.authorId !== session.user.id) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  await prisma.plan.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
