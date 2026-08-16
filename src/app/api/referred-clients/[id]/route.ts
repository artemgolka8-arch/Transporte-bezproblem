import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEdit, isAdmin } from "@/lib/roles";

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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (!canEdit(session.user.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const current = await prisma.referredClient.findUnique({ where: { id: params.id } });
  if (!current) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  const body = await req.json();
  const { firstName, lastName, phone, invitationType, city, link } = body;

  if (phone !== undefined && phone.trim() !== current.phone) {
    const clash = await prisma.referredClient.findUnique({ where: { phone: phone.trim() } });
    if (clash && clash.id !== current.id) {
      return NextResponse.json({ error: "Приглашённый с таким номером телефона уже есть" }, { status: 409 });
    }
  }
  if (invitationType !== undefined && !INVITATION_TYPES.includes(invitationType)) {
    return NextResponse.json({ error: "Укажите тип приглашения" }, { status: 400 });
  }
  if (city !== undefined && !CITIES.includes(city)) {
    return NextResponse.json({ error: "Укажите город" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (firstName !== undefined) data.firstName = firstName.trim();
  if (lastName !== undefined) data.lastName = lastName.trim();
  if (phone !== undefined) data.phone = phone.trim();
  if (invitationType !== undefined) data.invitationType = invitationType;
  if (city !== undefined) data.city = city;
  if (link !== undefined) data.link = link?.trim() || null;

  const referred = await prisma.referredClient.update({ where: { id: params.id }, data });
  return NextResponse.json(referred);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  await prisma.referredClient.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
