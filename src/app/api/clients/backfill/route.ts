import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/roles";

function normalizeKey(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

// Переносит в раздел "Клиенты" данные со всей техники, которая уже в аренде,
// но по каким-то причинам (например, была сдана в аренду до появления
// автоматического переноса, либо ravapi в свой раз не отдал телефон) ещё не
// привязана к карточке клиента.
//
// Сопоставление клиента: сначала по телефону (надёжно, поле уникальное).
// Если телефона у техники нет (renterPhone пуст) — пробуем найти уже
// существующую карточку клиента по "имя фамилия" и просто привязать её,
// не создавая новую и не считая это "пропуском". Завести новую карточку без
// телефона нельзя (обязательное уникальное поле) — вот тогда действительно
// пропускаем.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (!canEdit(session.user.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const vehicles = await prisma.vehicle.findMany({
    where: { status: "RENTED", clientId: null },
  });

  const existingClients = await prisma.client.findMany();
  const clientsByName = new Map<string, (typeof existingClients)[number]>();
  for (const c of existingClients) {
    const key = normalizeKey(`${c.firstName} ${c.lastName}`);
    if (key && !clientsByName.has(key)) clientsByName.set(key, c);
  }

  let created = 0;
  let linked = 0;
  const skipped: { code: string; name: string }[] = [];

  for (const v of vehicles) {
    const firstName = (v.renterFirstName || "").trim();
    const lastName = (v.renterLastName || "").trim();
    const phone = (v.renterPhone || "").trim();
    const email = v.renterEmail?.trim() || null;

    if (!phone) {
      const nameKey = normalizeKey(`${firstName} ${lastName}`);
      const byName = nameKey ? clientsByName.get(nameKey) : undefined;
      if (!byName) {
        skipped.push({ code: v.code, name: v.name });
        continue;
      }
      await prisma.vehicle.update({
        where: { id: v.id },
        data: { clientId: byName.id },
      });
      linked++;
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

    const clientNameKey = normalizeKey(`${client.firstName} ${client.lastName}`);
    if (clientNameKey) clientsByName.set(clientNameKey, client);

    await prisma.vehicle.update({
      where: { id: v.id },
      data: { clientId: client.id },
    });
  }

  return NextResponse.json({ created, linked, skipped });
}
