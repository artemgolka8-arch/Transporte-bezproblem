import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/roles";

// Переносит в раздел "Клиенты" данные со всей техники, которая уже в аренде,
// но по каким-то причинам (например, была сдана в аренду до появления
// автоматического переноса) ещё не привязана к карточке клиента.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (!canEdit(session.user.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const vehicles = await prisma.vehicle.findMany({
    where: { status: "RENTED", clientId: null },
  });

  let created = 0;
  let linked = 0;
  const skipped: { code: string; name: string }[] = [];

  for (const v of vehicles) {
    const firstName = (v.renterFirstName || "").trim();
    const lastName = (v.renterLastName || "").trim();
    const phone = (v.renterPhone || "").trim();
    const email = v.renterEmail?.trim() || null;

    if (!phone) {
      skipped.push({ code: v.code, name: v.name });
      continue;
    }

    const existing = await prisma.client.findUnique({ where: { phone } });

    const client = await prisma.client.upsert({
      where: { phone },
      update: {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        email: email ?? undefined,
      },
      create: {
        firstName: firstName || "—",
        lastName: lastName || "—",
        phone,
        email,
      },
    });

    if (existing) linked++;
    else created++;

    await prisma.vehicle.update({
      where: { id: v.id },
      data: { clientId: client.id },
    });
  }

  return NextResponse.json({ created, linked, skipped });
}
