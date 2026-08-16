import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { ReferredClientsList } from "@/components/ReferredClientsList";

export const dynamic = "force-dynamic";

export default async function ReferredClientsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const referred = await prisma.referredClient.findMany({
    orderBy: { createdAt: "desc" },
    include: { payouts: { orderBy: { createdAt: "desc" } } },
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
    city: r.city,
    link: r.link,
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

  const vehicles = await prisma.vehicle.findMany({ select: { status: true } });
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
      <ReferredClientsList referred={rows} role={session.user.role} />
    </AppShell>
  );
}
