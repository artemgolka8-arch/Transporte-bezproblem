import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/roles";
import { fetchActiveRentedVehicles, fetchActiveRentals, RavapiVehicle, RavapiDebtor } from "@/lib/ravapi";
import { normalizePhone } from "@/lib/phone";

function normalizeKey(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

// VIN сравниваем без пробелов/дефисов и регистра — так надёжнее (в ravapi и
// у нас его иногда вписывают чуть по-разному).
function normalizeVin(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase().replace(/[\s-]+/g, "");
}

// Имя водителя из ravapi приходит одной строкой ("Ivan Shanin"), а нам нужны
// firstName/lastName по отдельности для карточки клиента, если не получится
// найти точное совпадение в списке должников (там имя и фамилия разделены).
// Последнее слово считаем фамилией — не идеально для сложных ФИО, но это
// только запасной вариант на случай, если имя не нашлось в GetDebtors.
function splitDriverName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
}

// Синхронизация статусов техники с ravapi.eu (кнопка "Обновить" на вкладке
// "Транспорт", видна ADMIN/MANAGER).
//
// Источник активной аренды — POST /api/Vehicles/GetAll (vehicleStatus:2 —
// "передана водителю"): для каждой единицы техники там есть VIN и
// "Регистрационный номер" по отдельности. В ravapi VIN реально заполняют
// только скутерам — у велосипедов его роль играет "Регистрационный номер".
// Поэтому сопоставление с нашей базой (где поле vin используется для обоих
// типов техники) идёт по-разному в зависимости от типа: скутер сверяем по
// VIN ravapi, велосипед — по "Регистрационному номеру" ravapi (как по VIN).
// Если совпадения по VIN нет ни у той, ни у другой техники — общий запасной
// вариант для обоих типов: сверка по "Коду" (полю "Регистрационный номер"
// ravapi против нашего "Кода").
// Имя текущего водителя приходит вместе с этой же техникой; телефон клиента
// подтягиваем отдельно из GetDebtors (там же, где раздел "Должники"),
// сопоставляя по ФИО — это только обогащение, на сам факт аренды не влияет.
//
//   1. Нашлось совпадение по VIN/коду → техника переходит в "В аренде", в неё
//      подставляются данные клиента (заводится/обновляется карточка в
//      справочнике "Клиенты" по телефону, если телефон известен).
//   2. Техника раньше была синхронизирована из ravapi (стоит renterExternalId),
//      но сейчас не встретилась среди переданной водителям техники — аренда
//      завершена, техника переходит в "Доступен".
// Технику, которую сотрудники ставят "В аренде" вручную (без привязки к
// ravapi, renterExternalId = null), синхронизация не трогает вообще.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (!canEdit(session.user.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  let remoteVehicles: RavapiVehicle[];
  let remoteDrivers: RavapiDebtor[];
  try {
    [remoteVehicles, remoteDrivers] = await Promise.all([
      fetchActiveRentedVehicles(),
      fetchActiveRentals(),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Не удалось получить данные с ravapi.eu";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // Только техника, у которой реально указан текущий водитель.
  const active = remoteVehicles.filter((rv) => rv.drivers.length > 0 && rv.drivers[0]?.trim());

  // Индексы для сопоставления с нашей техникой.
  //
  // В ravapi поле Vin реально заполнено только у скутеров. У велосипедов VIN
  // не ведут — вместо этого их "вин" вписывают в RegistrationNumber. У нас же
  // в карточке техники поле vin используется для обоих типов (и скутер, и
  // велосипед хранят там свой VIN). Поэтому одной картой byVin не обойтись:
  //   - byVin: rv.Vin → техника ravapi. Годится для сверки со скутерами
  //     (v.vin скутера сравнивается с rv.vin).
  //   - byRegAsVin: rv.RegistrationNumber, нормализованный как VIN → техника
  //     ravapi. Годится для сверки с великами (v.vin велосипеда на самом деле
  //     хранит то же значение, что ravapi кладёт в RegistrationNumber).
  //   - byRegNumber: rv.RegistrationNumber, нормализованный как обычная
  //     строка → техника ravapi. Запасной вариант сопоставления по нашему
  //     полю "Код" (v.code), если по VIN совпадения нет — для обоих типов.
  const byVin = new Map<string, RavapiVehicle>();
  const byRegAsVin = new Map<string, RavapiVehicle>();
  const byRegNumber = new Map<string, RavapiVehicle>();
  for (const rv of active) {
    const vinKey = normalizeVin(rv.vin);
    if (vinKey && !byVin.has(vinKey)) byVin.set(vinKey, rv);

    const regAsVinKey = normalizeVin(rv.registrationNumber);
    if (regAsVinKey && !byRegAsVin.has(regAsVinKey)) byRegAsVin.set(regAsVinKey, rv);

    const regKey = normalizeKey(rv.registrationNumber);
    if (regKey && !byRegNumber.has(regKey)) byRegNumber.set(regKey, rv);
  }

  // Имя водителя (нормализованное "имя фамилия") → карточка из GetDebtors,
  // чтобы подтянуть телефон и точные firstName/lastName.
  const debtorsByName = new Map<string, RavapiDebtor>();
  for (const d of remoteDrivers) {
    const key = normalizeKey(`${d.firstName} ${d.lastName}`);
    if (key && !debtorsByName.has(key)) debtorsByName.set(key, d);
  }

  const vehicles = await prisma.vehicle.findMany();

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
    // Скутеры сверяем с ravapi по VIN (rv.vin), велосипеды — по VIN, но
    // сравнивая с полем RegistrationNumber ravapi (там у них лежит тот же
    // "вин", просто под другим именем). Если по VIN не нашлось — обоим типам
    // общий запасной вариант: сверка по "Коду" (rv.registrationNumber ↔ v.code).
    const vinKey = normalizeVin(v.vin);
    const byVinMatch = v.type === "BIKE" ? byRegAsVin.get(vinKey) : byVin.get(vinKey);
    const matched = byVinMatch ?? byRegNumber.get(normalizeKey(v.code));

    if (matched) {
      matchedRemoteIds.add(matched.id);

      const driverFullName = matched.drivers[0]?.trim() ?? "";
      const debtor = debtorsByName.get(normalizeKey(driverFullName));
      const fallback = splitDriverName(driverFullName);
      const firstName = debtor?.firstName || fallback.firstName;
      const lastName = debtor?.lastName || fallback.lastName;
      const phone = debtor?.phoneNumber?.trim() || null;

      const renterName = [firstName, lastName].filter(Boolean).join(" ") || driverFullName;
      const isNewRenter = v.renterExternalId !== matched.id || v.renter !== renterName;
      const needsStatusChange = v.status !== "RENTED";

      if (!isNewRenter && !needsStatusChange) {
        // Тот же арендатор, статус уже верный — просто освежаем отметку синхронизации
        await prisma.vehicle.update({ where: { id: v.id }, data: { ravapiSyncedAt: now } });
        continue;
      }

      let clientId: string | null = null;
      if (phone) {
        const key = normalizePhone(phone);
        let client = key ? clientsByPhone.get(key) : undefined;
        if (client) {
          client = await prisma.client.update({
            where: { id: client.id },
            data: {
              firstName: firstName || client.firstName,
              lastName: lastName || client.lastName,
            },
          });
        } else {
          client = await prisma.client.create({
            data: { firstName: firstName || "", lastName: lastName || "", phone },
          });
        }
        if (key) clientsByPhone.set(key, client);
        clientId = client.id;
      }

      await prisma.vehicle.update({
        where: { id: v.id },
        data: {
          status: "RENTED",
          renter: renterName || null,
          renterFirstName: firstName || null,
          renterLastName: lastName || null,
          renterPhone: phone,
          // Email при смене арендатора обнуляем — он относился к предыдущему
          // клиенту, ravapi email не передаёт.
          renterEmail: v.renterExternalId === matched.id ? v.renterEmail : null,
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
      // Раньше была синхронизирована из ravapi, сейчас техника не числится переданной водителю
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
