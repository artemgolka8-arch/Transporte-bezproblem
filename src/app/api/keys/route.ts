import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/roles";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (!canEdit(session.user.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const body = await req.json();
  const { vehicleId, label, isDuplicate, holder, notes } = body;

  if (!vehicleId || !label) {
    return NextResponse.json({ error: "Укажите транспорт и название ключа" }, { status: 400 });
  }

  const key = await prisma.key.create({
    data: {
      vehicleId,
      label,
      isDuplicate: !!isDuplicate,
      holder: holder || null,
      notes: notes || null,
    },
  });

  return NextResponse.json(key, { status: 201 });
}
