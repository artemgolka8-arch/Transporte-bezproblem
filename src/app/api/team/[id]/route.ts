import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEditPosition, TEAM_ROLES } from "@/lib/roles";

// Смена должности сотрудника из «Моей команды».
// Менять должность могут только директор и администратор; остальные поля
// чужого профиля через этот маршрут изменить нельзя вообще.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (!canEditPosition(session.user.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  if (typeof body.position !== "string") {
    return NextResponse.json({ error: "Укажите должность" }, { status: 400 });
  }
  const position = body.position.trim();
  if (position.length > 100) {
    return NextResponse.json({ error: "Слишком длинная должность" }, { status: 400 });
  }

  const target = await prisma.user.findFirst({
    where: { id: params.id, role: { in: TEAM_ROLES } },
    select: { id: true },
  });
  if (!target) return NextResponse.json({ error: "Сотрудник не найден" }, { status: 404 });

  const user = await prisma.user.update({
    where: { id: target.id },
    data: { position: position || null },
    select: { id: true, position: true },
  });
  return NextResponse.json(user);
}
