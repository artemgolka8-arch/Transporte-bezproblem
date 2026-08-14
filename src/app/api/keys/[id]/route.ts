import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/roles";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (!canEdit(session.user.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const body = await req.json();
  const { label, isDuplicate, holder, notes } = body;

  const key = await prisma.key.update({
    where: { id: params.id },
    data: {
      ...(label !== undefined ? { label } : {}),
      ...(isDuplicate !== undefined ? { isDuplicate } : {}),
      ...(holder !== undefined ? { holder } : {}),
      ...(notes !== undefined ? { notes } : {}),
    },
  });

  return NextResponse.json(key);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (!canEdit(session.user.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  await prisma.key.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
