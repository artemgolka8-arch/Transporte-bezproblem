import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAmbassador } from "@/lib/roles";
import { parsePlanInput, toPlanRow } from "@/lib/plans";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  // Амбассадор видит только свои планы; остальные роли — все
  const plans = await prisma.plan.findMany({
    where: isAmbassador(session.user.role) ? { authorId: session.user.id } : undefined,
    orderBy: [{ planDate: "desc" }, { createdAt: "desc" }],
    include: { author: { select: { id: true, name: true } } },
  });
  return NextResponse.json(plans.map(toPlanRow));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = parsePlanInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  // План всегда пишется от лица отправителя и сразу уходит на проверку (PENDING)
  const plan = await prisma.plan.create({
    data: { authorId: session.user.id, ...parsed.data },
    include: { author: { select: { id: true, name: true } } },
  });
  return NextResponse.json(toPlanRow(plan), { status: 201 });
}
