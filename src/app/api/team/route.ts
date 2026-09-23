import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TEAM_ROLES } from "@/lib/roles";

// «Моя команда» — лёгкий список сотрудников с аккаунтами (ADMIN/MANAGER/PR_MANAGER/DIRECTOR/AMBASSADOR).
// Доступен любому авторизованному пользователю, включая амбассадора и директора
// (см. isRestrictedPathAllowed в @/lib/roles) — без чувствительных полей вроде пароля.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const users = await prisma.user.findMany({
    where: { role: { in: TEAM_ROLES } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      position: true,
      city: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}
