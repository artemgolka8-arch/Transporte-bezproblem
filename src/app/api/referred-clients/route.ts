import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageReferredClients, isAmbassador } from "@/lib/roles";

const INVITATION_TYPES = ["FLEET_PARTNER", "RENT", "FLEET_PARTNER_RENT"];
const CITIES = [
  "Wrocław",
  "Warszawa",
  "Kraków",
  "Gdańsk",
  "Poznań",
  "Katowice",
  "Łódź",
  "Praha",
];

// Проверяем, что ambassadorId — это реальный пользователь с ролью AMBASSADOR.
// Возвращает null, если ambassadorId не указан / пустой; false — если указан неверно.
async function resolveAmbassadorId(raw: unknown): Promise<string | null | false> {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string") return false;
  const user = await prisma.user.findUnique({ where: { id: raw }, select: { role: true } });
  return user && user.role === "AMBASSADOR" ? raw : false;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  // Амбассадор видит только своих клиентов; остальные роли — всех
  const referred = await prisma.referredClient.findMany({
    where: isAmbassador(session.user.role) ? { ambassadorId: session.user.id } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      payouts: { orderBy: { createdAt: "desc" } },
      ambassador: { select: { id: true, name: true } },
    },
  });

  // Подтягиваем технику, которую сейчас арендует каждый приглашённый (совпадение по телефону
  // с активной арендой на технике). Как только технику снимают с аренды, её телефон-снапшот
  // на Vehicle обнуляется — и связь здесь пропадает сама, без отдельной логики отвязки.
  const phones = referred.map((r) => r.phone);
  const rentedVehicles = phones.length
    ? await prisma.vehicle.findMany({
        where: { status: "RENTED", renterPhone: { in: phones } },
        select: { id: true, code: true, name: true, renterPhone: true },
      })
    : [];

  const result = referred.map((r) => ({
    ...r,
    vehicles: rentedVehicles.filter((v) => v.renterPhone === r.phone),
    payoutTotal: r.payouts.reduce((sum, p) => sum + p.amount, 0),
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  // Добавлять клиентов могут админ/менеджер/PR-менеджер и амбассадор (только за себя)
  const ambassadorSelf = isAmbassador(session.user.role);
  if (!canManageReferredClients(session.user.role) && !ambassadorSelf) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const body = await req.json();
  const { firstName, lastName, phone, invitationType, city, link, ambassadorId } = body;

  if (!firstName?.trim() || !lastName?.trim() || !phone?.trim()) {
    return NextResponse.json({ error: "Заполните имя, фамилию и телефон" }, { status: 400 });
  }
  if (!INVITATION_TYPES.includes(invitationType)) {
    return NextResponse.json({ error: "Укажите тип приглашения" }, { status: 400 });
  }
  if (!CITIES.includes(city)) {
    return NextResponse.json({ error: "Укажите город" }, { status: 400 });
  }

  // Амбассадор всегда добавляет клиента на себя — что бы ни пришло в запросе
  const resolvedAmbassadorId = ambassadorSelf ? session.user.id : await resolveAmbassadorId(ambassadorId);
  if (resolvedAmbassadorId === false) {
    return NextResponse.json({ error: "Укажите амбассадора из списка" }, { status: 400 });
  }

  const existing = await prisma.referredClient.findUnique({ where: { phone: phone.trim() } });
  if (existing) {
    return NextResponse.json({ error: "Приглашённый с таким номером телефона уже есть" }, { status: 409 });
  }

  const referred = await prisma.referredClient.create({
    data: {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      invitationType,
      city,
      // Ссылку заполняют сотрудники, поэтому у амбассадора при создании её нет
      link: ambassadorSelf ? null : link?.trim() || null,
      ambassadorId: resolvedAmbassadorId,
    },
    include: { ambassador: { select: { id: true, name: true } } },
  });

  return NextResponse.json(
    {
      ...referred,
      ambassadorName: referred.ambassador?.name ?? null,
      vehicles: [],
      payouts: [],
      payoutTotal: 0,
    },
    { status: 201 }
  );
}
