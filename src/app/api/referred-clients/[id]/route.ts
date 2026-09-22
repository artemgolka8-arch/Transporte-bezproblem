import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageReferredClients, canDeleteReferredClient } from "@/lib/roles";

const INVITATION_TYPES = ["FLEET_PARTNER", "RENT", "FLEET_PARTNER_RENT"];
const STATUSES = ["ACTIVE", "PENDING", "IN_PROGRESS", "INACTIVE"];
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
  if (!canManageReferredClients(session.user.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const current = await prisma.referredClient.findUnique({ where: { id: params.id } });
  if (!current) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  const body = await req.json();
  const { firstName, lastName, phone, invitationType, city, link, ambassadorId, status } = body;

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
  if (status !== undefined && !STATUSES.includes(status)) {
    return NextResponse.json({ error: "Некорректный статус" }, { status: 400 });
  }

  if (ambassadorId !== undefined && ambassadorId !== null && ambassadorId !== "") {
    const amb =
      typeof ambassadorId === "string"
        ? await prisma.user.findUnique({ where: { id: ambassadorId }, select: { role: true } })
        : null;
    if (!amb || amb.role !== "AMBASSADOR") {
      return NextResponse.json({ error: "Укажите амбассадора из списка" }, { status: 400 });
    }
  }

  const data: Record<string, unknown> = {};
  if (firstName !== undefined) data.firstName = firstName.trim();
  if (lastName !== undefined) data.lastName = lastName.trim();
  if (phone !== undefined) data.phone = phone.trim();
  if (invitationType !== undefined) data.invitationType = invitationType;
  if (city !== undefined) data.city = city;
  if (link !== undefined) data.link = link?.trim() || null;
  if (status !== undefined) data.status = status;
  // null / "" — снять закрепление за амбассадором
  if (ambassadorId !== undefined) data.ambassadorId = ambassadorId || null;

  const referred = await prisma.referredClient.update({
    where: { id: params.id },
    data,
    include: { ambassador: { select: { id: true, name: true } } },
  });
  return NextResponse.json(referred);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (!canDeleteReferredClient(session.user.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  await prisma.referredClient.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
