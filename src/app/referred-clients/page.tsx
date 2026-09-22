import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AMBASSADOR_BRAND, isAmbassador, isViewRestrictedRole } from "@/lib/roles";
import { AppShell } from "@/components/AppShell";
import { ReferredClientsList } from "@/components/ReferredClientsList";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: AMBASSADOR_BRAND,
};

export default async function ReferredClientsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const ambassadorOnly = isAmbassador(session.user.role);

  // Амбассадор получает с сервера только своих клиентов (чужие в браузер не попадают).
  // Остальные роли получают всех — директор/админ/менеджер выбирают амбассадора в списке.
  const referred = await prisma.referredClient.findMany({
    where: ambassadorOnly ? { ambassadorId: session.user.id } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      payouts: { orderBy: { createdAt: "desc" } },
      ambassador: { select: { id: true, name: true } },
    },
  });

  const ambassadors = ambassadorOnly
    ? []
    : await prisma.user.findMany({
        where: { role: "AMBASSADOR" },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });

  const phones = referred.map((r) => r.phone);
  const rentedVehicles = phones.length
    ? await prisma.vehicle.findMany({
        where: { status: "RENTED", renterPhone: { in: phones } },
        select: { id: true, code: true, name: true, renterPhone: true },
      })
    : [];

  const rows = referred.map((r) => ({
    id: r.id,
    firstName: r.firstName,
    lastName: r.lastName,
    phone: r.phone,
    invitationType: r.invitationType,
    status: r.status,
    city: r.city,
    link: r.link,
    ambassadorId: r.ambassadorId,
    ambassadorName: r.ambassador?.name ?? null,
    vehicles: rentedVehicles
      .filter((v) => v.renterPhone === r.phone)
      .map((v) => ({ id: v.id, code: v.code, name: v.name })),
    payouts: r.payouts.map((p) => ({
      id: p.id,
      amount: p.amount,
      note: p.note,
      createdByName: p.createdByName,
      createdAt: p.createdAt.toISOString(),
    })),
    payoutTotal: r.payouts.reduce((sum, p) => sum + p.amount, 0),
  }));

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
      <ReferredClientsList referred={rows} role={session.user.role} ambassadors={ambassadors} />
    </AppShell>
  );
}
