import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TEAM_ROLES } from "@/lib/roles";

// Фото сотрудника для «Моей команды». В базе оно лежит как data URL (base64),
// а здесь отдаётся обычной картинкой — так браузер кэширует её и мы не раздуваем
// HTML страницы. Версия в ?v=... меняется при смене фото.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const user = await prisma.user.findFirst({
    where: { id: params.id, role: { in: TEAM_ROLES } },
    select: { avatarUrl: true },
  });

  // Отдаём только растровые картинки (никаких svg/html из data URL)
  const match = user?.avatarUrl?.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([\s\S]+)$/);
  if (!match) return new NextResponse(null, { status: 404 });

  return new NextResponse(new Uint8Array(Buffer.from(match[2], "base64")), {
    headers: {
      "Content-Type": match[1],
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
