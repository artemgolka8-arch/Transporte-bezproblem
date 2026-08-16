import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/roles";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const payouts = await prisma.referredClientPayout.findMany({
    where: { referredClientId: params.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(payouts);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (!canEdit(session.user.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const referred = await prisma.referredClient.findUnique({ where: { id: params.id } });
  if (!referred) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  const body = await req.json();
  const amount = Number(body.amount);
  const note = typeof body.note === "string" ? body.note.trim() : null;

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Укажите сумму выплаты" }, { status: 400 });
  }

  const payout = await prisma.referredClientPayout.create({
    data: {
      referredClientId: params.id,
      amount,
      note: note || null,
      createdByName: session.user.name || session.user.email || null,
    },
  });

  return NextResponse.json(payout, { status: 201 });
}
