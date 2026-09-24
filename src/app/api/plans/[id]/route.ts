import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canDeleteAnyReport } from "@/lib/roles";
import { parsePlanInput, toPlanRow } from "@/lib/plans";

// Автор исправляет свой план после отказа или предложения проверяющего.
// После исправления план снова уходит на проверку.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const plan = await prisma.plan.findUnique({ where: { id: params.id } });
  if (!plan) return NextResponse.json({ error: "План не найден" }, { status: 404 });
  if (plan.authorId !== session.user.id) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  if (plan.reviewStatus !== "REJECTED" && plan.reviewStatus !== "SUGGESTION") {
    return NextResponse.json({ error: "Этот план сейчас исправлять нельзя" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = parsePlanInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const updated = await prisma.plan.update({
    where: { id: params.id },
    data: {
      ...parsed.data,
      reviewStatus: "PENDING",
      reviewComment: null,
      reviewedById: null,
      reviewedByName: null,
      reviewedAt: null,
    },
    include: { author: { select: { id: true, name: true } } },
  });
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
