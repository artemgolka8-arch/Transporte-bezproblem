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
  const {
    status,
    problemDescription,
    note,
    name,
    location,
    rentedUntil,
    brand,
    city,
    imageUrl,
    renterFirstName,
    renterLastName,
    renterPhone,
    renterEmail,
    workshopDate,
    workshopReason,
    workshopMileage,
    workshopCity,
  } = body;

  const current = await prisma.vehicle.findUnique({ where: { id: params.id } });
  if (!current) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  const statusChanged = status !== undefined && status !== current.status;

  // Переход в статус "В аренде" разрешён только если заполнены все данные клиента
  if (statusChanged && status === "RENTED") {
    const firstName = renterFirstName !== undefined ? renterFirstName : current.renterFirstName;
    const lastName = renterLastName !== undefined ? renterLastName : current.renterLastName;
    const phone = renterPhone !== undefined ? renterPhone : current.renterPhone;
    const email = renterEmail !== undefined ? renterEmail : current.renterEmail;
    if (!firstName?.trim() || !lastName?.trim() || !phone?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: "Для статуса «В аренде» заполните имя, фамилию, телефон и email клиента" },
        { status: 400 }
      );
    }
  }

  // Переход в статус "В мастерской" разрешён только если заполнена заявка на ремонт
  if (statusChanged && status === "WORKSHOP") {
    const date = workshopDate !== undefined ? workshopDate : current.workshopDate;
    const reason = workshopReason !== undefined ? workshopReason : current.workshopReason;
    const mileage = workshopMileage !== undefined ? workshopMileage : current.workshopMileage;
    const wCity = workshopCity !== undefined ? workshopCity : current.workshopCity;
    if (!date || !reason?.trim() || mileage === null || mileage === undefined || !wCity?.trim()) {
      return NextResponse.json(
        { error: "Для статуса «В мастерской» заполните дату, причину, пробег и город" },
        { status: 400 }
      );
    }
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (brand !== undefined) data.brand = brand || null;
  if (city !== undefined) data.city = city || null;
  if (imageUrl !== undefined) data.imageUrl = imageUrl || null;
  if (location !== undefined) data.location = location;
  if (rentedUntil !== undefined) data.rentedUntil = rentedUntil ? new Date(rentedUntil) : null;
  if (problemDescription !== undefined) data.problemDescription = problemDescription;
  if (status !== undefined) data.status = status;

  if (renterFirstName !== undefined) data.renterFirstName = renterFirstName || null;
  if (renterLastName !== undefined) data.renterLastName = renterLastName || null;
  if (renterPhone !== undefined) data.renterPhone = renterPhone || null;
  if (renterEmail !== undefined) data.renterEmail = renterEmail || null;
  if (renterFirstName !== undefined || renterLastName !== undefined) {
    const fn = renterFirstName !== undefined ? renterFirstName : current.renterFirstName;
    const ln = renterLastName !== undefined ? renterLastName : current.renterLastName;
    data.renter = [fn, ln].filter(Boolean).join(" ") || null;
  }

  if (workshopDate !== undefined) data.workshopDate = workshopDate ? new Date(workshopDate) : null;
  if (workshopReason !== undefined) data.workshopReason = workshopReason || null;
  if (workshopMileage !== undefined) data.workshopMileage = workshopMileage === "" || workshopMileage === null ? null : Number(workshopMileage);
  if (workshopCity !== undefined) data.workshopCity = workshopCity || null;

  // При выходе из аренды очищаем данные клиента, чтобы следующая аренда требовала новых данных
  if (statusChanged && current.status === "RENTED" && status !== "RENTED") {
    data.renter = null;
    data.renterFirstName = null;
    data.renterLastName = null;
    data.renterPhone = null;
    data.renterEmail = null;
    data.rentedUntil = null;
  }

  // При выходе из мастерской очищаем заявку на ремонт, чтобы следующий заезд требовал новых данных
  if (statusChanged && current.status === "WORKSHOP" && status !== "WORKSHOP") {
    data.workshopDate = null;
    data.workshopReason = null;
    data.workshopMileage = null;
    data.workshopCity = null;
  }

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
