import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/Navbar";
import { FleetDashboard } from "@/components/FleetDashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const vehicles = await prisma.vehicle.findMany({
    include: { keys: { select: { id: true } } },
    orderBy: { createdAt: "desc" },
  });

  const counts = {
    AVAILABLE: vehicles.filter((v) => v.status === "AVAILABLE").length,
    WORKSHOP: vehicles.filter((v) => v.status === "WORKSHOP").length,
    RENTED: vehicles.filter((v) => v.status === "RENTED").length,
  };

  // Передаём в клиентский компонент только простые сериализуемые поля
  const cards = vehicles.map((v) => ({
    id: v.id,
    code: v.code,
    name: v.name,
    type: v.type,
    status: v.status,
    problemDescription: v.problemDescription,
    location: v.location,
    renter: v.renter,
    keys: v.keys,
  }));

  return (
    <>
      <Navbar
        counts={counts}
        userName={session.user.name || session.user.email || ""}
        role={session.user.role}
      />
      <FleetDashboard vehicles={cards} role={session.user.role} />
    </>
  );
}
