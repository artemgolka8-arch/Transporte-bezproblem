import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isViewRestrictedRole } from "@/lib/roles";
import { AppShell } from "@/components/AppShell";
import { TeamList } from "@/components/TeamList";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Моя команда",
};

export default async function TeamPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const users = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "MANAGER", "PR_MANAGER", "DIRECTOR"] } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      position: true,
      city: true,
    },
    orderBy: { name: "asc" },
  });

  // Амбассадору, директору и PR-менеджеру статистику автопарка не показываем
  // (и не отдаём в браузер)
  const vehicles = isViewRestrictedRole(session.user.role)
    ? []
    : await prisma.vehicle.findMany({ select: { status: true } });
  const counts = {
    AVAILABLE: vehicles.filter((v) => v.status === "AVAILABLE").length,
    WORKSHOP: vehicles.filter((v) => v.status === "WORKSHOP").length,
    RENTED: vehicles.filter((v) => v.status === "RENTED").length,
  };

  return (
    <AppShell
      counts={counts}
      userName={session.user.name || session.user.email || ""}
      role={session.user.role}
    >
      <TeamList members={users} currentUserId={session.user.id} />
    </AppShell>
  );
}
