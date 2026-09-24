import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canReviewReports } from "@/lib/roles";
import { toReportRow } from "@/lib/reports";

// Проверка отчёта: подтвердить (APPROVED) или не подтвердить (REJECTED).
// Не подтверждая, проверяющий обязан написать, что не так и что нужно изменить.
// Доступно PR-менеджеру, директору и администратору; свой отчёт проверять нельзя.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (!canReviewReports(session.user.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const report = await prisma.report.findUnique({ where: { id: params.id }, select: { id: true, authorId: true } });
  if (!report) return NextResponse.json({ error: "Отчёт не найден" }, { status: 404 });
  if (report.authorId === session.user.id) {
    return NextResponse.json({ error: "Свой отчёт проверять нельзя" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const decision = body.decision;
  if (decision !== "APPROVED" && decision !== "REJECTED") {
    return NextResponse.json({ error: "Укажите решение" }, { status: 400 });
  }

  const comment = typeof body.comment === "string" ? body.comment.trim() : "";
  if (decision === "REJECTED" && !comment) {
    return NextResponse.json({ error: "Опишите, что нужно изменить" }, { status: 400 });
  }
  if (comment.length > 1000) {
    return NextResponse.json({ error: "Слишком длинный комментарий" }, { status: 400 });
  }

  const updated = await prisma.report.update({
    where: { id: params.id },
    data: {
      reviewStatus: decision,
      // Комментарий нужен только к «не подтверждён»; при подтверждении старое замечание убираем
      reviewComment: decision === "REJECTED" ? comment : null,
      reviewedById: session.user.id,
      reviewedByName: session.user.name || session.user.email || null,
      reviewedAt: new Date(),
    },
    include: { author: { select: { id: true, name: true } } },
  });
  return NextResponse.json(toReportRow(updated));
}
