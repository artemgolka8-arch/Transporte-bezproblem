import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAmbassador } from "@/lib/roles";
import { parseReportInput, toReportRow } from "@/lib/reports";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  // Амбассадор видит только свои отчёты; остальные роли — все
  const reports = await prisma.report.findMany({
    where: isAmbassador(session.user.role) ? { authorId: session.user.id } : undefined,
    orderBy: { date: "desc" },
    include: { author: { select: { id: true, name: true } } },
  });

  const result = reports.map((r) => ({ ...r, authorName: r.author.name }));
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = parseReportInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  // Отчёт всегда пишется от лица того, кто его отправляет — это самоотчёт.
  // Новый отчёт попадает на проверку (reviewStatus = PENDING по умолчанию).
  const report = await prisma.report.create({
    data: { authorId: session.user.id, ...parsed.data },
    include: { author: { select: { id: true, name: true } } },
  });

  return NextResponse.json(toReportRow(report), { status: 201 });
}
