import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; payoutId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const payout = await prisma.referredClientPayout.findUnique({ where: { id: params.payoutId } });
  if (!payout || payout.referredClientId !== params.id) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  await prisma.referredClientPayout.delete({ where: { id: params.payoutId } });
  return NextResponse.json({ ok: true });
}
