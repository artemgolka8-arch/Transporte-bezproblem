import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canDeleteAnyReport, isAmbassador } from "@/lib/roles";
import { parseReportInput, toReportRow } from "@/lib/reports";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const report = await prisma.report.findUnique({ where: { id: params.id } });
  if (!report) return NextResponse.json({ error: "Отчёт не найден" }, { status: 404 });

  // Удалить может админ, либо сам автор отчёта (например, при ошибке)
  const isOwner = isAmbassador(session.user.role) && report.authorId === session.user.id;
  if (!canDeleteAnyReport(session.user.role) && !isOwner) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  await prisma.report.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

// Автор исправляет свой отчёт после того, как его не подтвердили.
// После исправления отчёт снова уходит на проверку.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const report = await prisma.report.findUnique({ where: { id: params.id } });
  if (!report) return NextResponse.json({ error: "Отчёт не найден" }, { status: 404 });
  if (report.authorId !== session.user.id) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  if (report.reviewStatus !== "REJECTED") {
    return NextResponse.json({ error: "Исправить можно только не подтверждённый отчёт" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = parseReportInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const updated = await prisma.report.update({
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
  return NextResponse.json(toReportRow(updated));
}
