import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/roles";
import { fetchActiveRentals, RavapiDebtor } from "@/lib/ravapi";
import { normalizePhone } from "@/lib/phone";

function normalizeKey(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

// Синхронизация статусов техники с ravapi.eu (кнопка "Обновить" на вкладке
// "Транспорт", видна ADMIN/MANAGER). Сопоставляет vehicleName из ravapi с
// техникой в базе — сначала по коду (гос. номеру), затем по названию:
//   1. Нашёлся активный арендатор → техника переходит в "В аренде", в неё
//      подставляются данные клиента (заводится/обновляется карточка в
//      справочнике "Клиенты" по телефону, если телефон известен).
//   2. Техника раньше была синхронизирована из ravapi (стоит renterExternalId),
//      но её текущий арендатор больше не встретился среди активных — аренда
//      завершена, техника переходит в "Доступен".
// Технику, которую сотрудники ставят "В аренде" вручную (без привязки к
// ravapi, renterExternalId = null), синхронизация не трогает вообще.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (!canEdit(session.user.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  let remote: RavapiDebtor[];
  try {
    remote = await fetchActiveRentals();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Не удалось получить данные с ravapi.eu";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // Оставляем только записи, где реально указана арендуемая техника
  const active = remote.filter((d) => d.vehicleName && d.vehicleName.trim());

  // Один ключ (нормализованное название техники) → одна запись ravapi.
  // Если несколько записей случайно указывают на одно название — побеждает
  // первая; в норме такого быть не должно (один транспорт = один арендатор).
  const byVehicleName = new Map<string, RavapiDebtor>();
  for (const d of active) {
    const key = normalizeKey(d.vehicleName);
    if (!byVehicleName.has(key)) byVehicleName.set(key, d);
  }

  const vehicles = await prisma.vehicle.findMany();

  // Предзагружаем клиентов, чтобы не бить базу по разу на каждую единицу
  // техники, и сопоставляем по последним 9 цифрам телефона (см. lib/phone.ts) —
  // формат номера в ravapi может отличаться от того, что вводили вручную.
  const existingClients = await prisma.client.findMany();
  const clientsByPhone = new Map<string, (typeof existingClients)[number]>();
  for (const c of existingClients) {
    const key = normalizePhone(c.phone);
    if (key) clientsByPhone.set(key, c);
  }

  const actorName = session.user.name || session.user.email || "Ravapi";
  const now = new Date();

  let rented = 0;
  let released = 0;
  const matchedRemoteIds = new Set<number>();

  for (const v of vehicles) {
    const matched =
      byVehicleName.get(normalizeKey(v.code)) ?? byVehicleName.get(normalizeKey(v.name));

    if (matched) {
      matchedRemoteIds.add(matched.id);
      const isNewRenter = v.renterExternalId !== matched.id;
      const needsStatusChange = v.status !== "RENTED";

      if (!isNewRenter && !needsStatusChange) {
        // Тот же арендатор, статус уже верный — просто освежаем отметку синхронизации
        await prisma.vehicle.update({ where: { id: v.id }, data: { ravapiSyncedAt: now } });
        continue;
      }

      let clientId: string | null = null;
      const phone = matched.phoneNumber?.trim() || null;
      if (phone) {
        const key = normalizePhone(phone);
        let client = key ? clientsByPhone.get(key) : undefined;
        if (client) {
          client = await prisma.client.update({
            where: { id: client.id },
            data: {
              firstName: matched.firstName || client.firstName,
              lastName: matched.lastName || client.lastName,
            },
          });
        } else {
          client = await prisma.client.create({
            data: {
              firstName: matched.firstName || "",
              lastName: matched.lastName || "",
              phone,
            },
          });
        }
        if (key) clientsByPhone.set(key, client);
        clientId = client.id;
      }

      const renterName = [matched.firstName, matched.lastName].filter(Boolean).join(" ");

      await prisma.vehicle.update({
        where: { id: v.id },
        data: {
          status: "RENTED",
          renter: renterName || null,
          renterFirstName: matched.firstName || null,
          renterLastName: matched.lastName || null,
          renterPhone: phone,
          // Email при смене арендатора обнуляем — он относился к предыдущему
          // клиенту, ravapi email не передаёт.
          renterEmail: isNewRenter ? null : v.renterEmail,
          renterExternalId: matched.id,
          ravapiSyncedAt: now,
          clientId,
          history: {
            create: {
              status: "RENTED",
              note: `Синхронизировано из Ravapi: ${renterName || "клиент без имени"}`,
              userName: actorName,
            },
          },
        },
      });
      rented++;
    } else if (v.renterExternalId !== null) {
      // Раньше была синхронизирована из ravapi, сейчас арендатор не найден среди активных
      await prisma.vehicle.update({
        where: { id: v.id },
        data: {
          status: "AVAILABLE",
          renter: null,
          renterFirstName: null,
          renterLastName: null,
          renterPhone: null,
          renterEmail: null,
          rentedUntil: null,
          renterExternalId: null,
          ravapiSyncedAt: null,
          clientId: null,
          history: {
            create: {
              status: "AVAILABLE",
              note: "Синхронизировано из Ravapi: аренда завершена",
              userName: actorName,
            },
          },
        },
      });
      released++;
    }
  }

  const unmatched = active.length - matchedRemoteIds.size;

  return NextResponse.json({
    rented,
    released,
    totalActive: active.length,
    unmatched,
  });
}
