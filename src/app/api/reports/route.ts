import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAmbassador } from "@/lib/roles";

const RATINGS = ["BAD", "NORMAL", "GREAT", "EXCELLENT"];

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

  const body = await req.json();
  const {
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
  } = body;

  if (!description?.trim()) {
    return NextResponse.json({ error: "Опишите проделанную работу" }, { status: 400 });
  }
  if (!date || Number.isNaN(new Date(date).getTime())) {
    return NextResponse.json({ error: "Укажите дату отчёта" }, { status: 400 });
  }
  if (!RATINGS.includes(selfRating)) {
    return NextResponse.json({ error: "Укажите оценку проделанной работы" }, { status: 400 });
  }

  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  // Отчёт всегда пишется от лица того, кто его отправляет — это самоотчёт
  const report = await prisma.report.create({
    data: {
      authorId: session.user.id,
      date: new Date(date),
      description: description.trim(),
      hoursWorked: num(hoursWorked),
      partnerVisits: Math.round(num(partnerVisits)),
      rentVisits: Math.round(num(rentVisits)),
      partnerLeads: Math.round(num(partnerLeads)),
      rentLeads: Math.round(num(rentLeads)),
      tiktokVideos: Math.round(num(tiktokVideos)),
      stories: Math.round(num(stories)),
      selfRating,
    },
    include: { author: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ ...report, authorName: report.author.name }, { status: 201 });
}
