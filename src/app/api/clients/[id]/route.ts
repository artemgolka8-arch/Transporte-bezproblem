import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEdit, isAdmin } from "@/lib/roles";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      vehicles: {
        orderBy: { updatedAt: "desc" },
        select: { id: true, code: true, name: true, status: true, imageUrl: true, rentedUntil: true },
      },
    },
  });
  if (!client) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  return NextResponse.json(client);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (!canEdit(session.user.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const body = await req.json();
  const { firstName, lastName, phone, email, notes } = body;

  const current = await prisma.client.findUnique({ where: { id: params.id } });
  if (!current) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  if (phone !== undefined && phone.trim() !== current.phone) {
    const clash = await prisma.client.findUnique({ where: { phone: phone.trim() } });
    if (clash && clash.id !== current.id) {
      return NextResponse.json({ error: "Клиент с таким номером телефона уже есть" }, { status: 409 });
    }
  }

  const data: Record<string, unknown> = {};
  if (firstName !== undefined) data.firstName = firstName.trim();
  if (lastName !== undefined) data.lastName = lastName.trim();
  if (phone !== undefined) data.phone = phone.trim();
  if (email !== undefined) data.email = email?.trim() || null;
  if (notes !== undefined) data.notes = notes?.trim() || null;

  const client = await prisma.client.update({
    where: { id: params.id },
    data,
  });

  // Если телефон изменился, синхронизируем его и в снапшоте активной аренды на технике
  if (phone !== undefined || firstName !== undefined || lastName !== undefined || email !== undefined) {
    await prisma.vehicle.updateMany({
      where: { clientId: client.id, status: "RENTED" },
      data: {
        renterFirstName: client.firstName,
        renterLastName: client.lastName,
        renter: [client.firstName, client.lastName].filter(Boolean).join(" "),
        renterPhone: client.phone,
        renterEmail: client.email,
      },
    });
  }

  return NextResponse.json(client);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  await prisma.vehicle.updateMany({ where: { clientId: params.id }, data: { clientId: null } });
  await prisma.client.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
