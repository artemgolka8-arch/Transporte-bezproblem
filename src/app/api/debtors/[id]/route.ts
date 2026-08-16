import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/roles";

// Обновление редактируемых вручную полей должника: заметка о долге
// («обещал оплатить до пятницы») и отметка «связались».
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (!canEdit(session.user.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const data: { debtNotes?: string | null; isContactedForDebt?: boolean } = {};

  if ("debtNotes" in body) {
    const notes = typeof body.debtNotes === "string" ? body.debtNotes.trim() : "";
    data.debtNotes = notes || null;
  }
  if ("isContactedForDebt" in body) {
    data.isContactedForDebt = !!body.isContactedForDebt;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Нечего обновлять" }, { status: 400 });
  }

  const debtor = await prisma.debtor.findUnique({ where: { id: params.id } });
  if (!debtor) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  const updated = await prisma.debtor.update({ where: { id: params.id }, data });
  return NextResponse.json(updated);
}
