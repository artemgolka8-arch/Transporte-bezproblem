import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/roles";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: params.id },
    include: {
      keys: { orderBy: { createdAt: "asc" } },
      history: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!vehicle) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  return NextResponse.json(vehicle);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (!canEdit(session.user.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const body = await req.json();
  const { status, problemDescription, note, name, location, renter, rentedUntil, brand, city } = body;

  const current = await prisma.vehicle.findUnique({ where: { id: params.id } });
  if (!current) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (brand !== undefined) data.brand = brand || null;
  if (city !== undefined) data.city = city || null;
  if (location !== undefined) data.location = location;
  if (renter !== undefined) data.renter = renter;
  if (rentedUntil !== undefined) data.rentedUntil = rentedUntil ? new Date(rentedUntil) : null;
  if (problemDescription !== undefined) data.problemDescription = problemDescription;
  if (status !== undefined) data.status = status;

  const statusChanged = status !== undefined && status !== current.status;

  const vehicle = await prisma.vehicle.update({
    where: { id: params.id },
    data: {
      ...data,
      ...(statusChanged || note
        ? {
            history: {
              create: {
                status: status ?? current.status,
                note: note || (statusChanged ? "Статус изменён" : "Обновление"),
                userName: session.user.name || session.user.email || "Неизвестно",
              },
            },
          }
        : {}),
    },
    include: { keys: true, history: { orderBy: { createdAt: "desc" } } },
  });

  return NextResponse.json(vehicle);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  await prisma.vehicle.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
