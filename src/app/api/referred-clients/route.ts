import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/roles";

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

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const referred = await prisma.referredClient.findMany({
    orderBy: { createdAt: "desc" },
    include: { payouts: { orderBy: { createdAt: "desc" } } },
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
  if (!canEdit(session.user.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const body = await req.json();
  const { firstName, lastName, phone, invitationType, city, link } = body;

  if (!firstName?.trim() || !lastName?.trim() || !phone?.trim()) {
    return NextResponse.json({ error: "Заполните имя, фамилию и телефон" }, { status: 400 });
  }
  if (!INVITATION_TYPES.includes(invitationType)) {
    return NextResponse.json({ error: "Укажите тип приглашения" }, { status: 400 });
  }
  if (!CITIES.includes(city)) {
    return NextResponse.json({ error: "Укажите город" }, { status: 400 });
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
      link: link?.trim() || null,
    },
  });

  return NextResponse.json({ ...referred, vehicles: [], payouts: [], payoutTotal: 0 }, { status: 201 });
}
