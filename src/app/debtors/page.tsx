import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { DebtorsList } from "@/components/DebtorsList";

export const dynamic = "force-dynamic";

export default async function DebtorsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const debtors = await prisma.debtor.findMany({
    orderBy: { currentBalance: "asc" },
  });

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
      <DebtorsList
        debtors={debtors.map((d) => ({
          id: d.id,
          firstName: d.firstName,
          lastName: d.lastName,
          phoneNumber: d.phoneNumber,
          vehicleName: d.vehicleName,
          organisation: d.organisation,
          currentBalance: d.currentBalance,
          balanceWithDeposits: d.balanceWithDeposits,
          dateOfLastUnpaidPayoff: d.dateOfLastUnpaidPayoff
            ? d.dateOfLastUnpaidPayoff.toISOString()
            : null,
          debtNotes: d.debtNotes,
          isContactedForDebt: d.isContactedForDebt,
          lastSyncedAt: d.lastSyncedAt.toISOString(),
        }))}
        role={session.user.role}
      />
    </AppShell>
  );
}
