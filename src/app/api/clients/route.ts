import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/roles";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const clients = await prisma.client.findMany({
    include: {
      vehicles: {
        where: { status: "RENTED" },
        select: { id: true, code: true, name: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (!canEdit(session.user.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const body = await req.json();
  const { firstName, lastName, phone, email, notes } = body;

  if (!firstName?.trim() || !lastName?.trim() || !phone?.trim()) {
    return NextResponse.json({ error: "Заполните имя, фамилию и телефон" }, { status: 400 });
  }

  const existing = await prisma.client.findUnique({ where: { phone: phone.trim() } });
  if (existing) {
    return NextResponse.json({ error: "Клиент с таким номером телефона уже есть" }, { status: 409 });
  }

  const client = await prisma.client.create({
    data: {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      email: email?.trim() || null,
      notes: notes?.trim() || null,
    },
  });

  return NextResponse.json(client);
}
