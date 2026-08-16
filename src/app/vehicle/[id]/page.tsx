import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { VehicleDetail } from "@/components/VehicleDetail";

export const dynamic = "force-dynamic";

export default async function VehiclePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: params.id },
    include: {
      keys: { orderBy: { createdAt: "asc" } },
      history: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!vehicle) notFound();

  const allVehicles = await prisma.vehicle.findMany({ select: { status: true } });
  const counts = {
    AVAILABLE: allVehicles.filter((v) => v.status === "AVAILABLE").length,
    WORKSHOP: allVehicles.filter((v) => v.status === "WORKSHOP").length,
    RENTED: allVehicles.filter((v) => v.status === "RENTED").length,
  };

  return (
    <AppShell
      counts={counts}
      userName={session.user.name || session.user.email || ""}
      role={session.user.role}
    >
      <VehicleDetail
        vehicle={{
          id: vehicle.id,
          code: vehicle.code,
          vin: vehicle.vin,
          name: vehicle.name,
          type: vehicle.type,
          status: vehicle.status,
          brand: vehicle.brand,
          color: vehicle.color,
          city: vehicle.city,
          imageUrl: vehicle.imageUrl,
          renterFirstName: vehicle.renterFirstName,
          renterLastName: vehicle.renterLastName,
          renterPhone: vehicle.renterPhone,
          renterEmail: vehicle.renterEmail,
          workshopDate: vehicle.workshopDate ? vehicle.workshopDate.toISOString() : null,
          workshopReason: vehicle.workshopReason,
          workshopMileage: vehicle.workshopMileage,
          workshopCity: vehicle.workshopCity,
          problemDescription: vehicle.problemDescription,
          location: vehicle.location,
          renter: vehicle.renter,
          keys: vehicle.keys.map((k) => ({
            id: k.id,
            label: k.label,
            isDuplicate: k.isDuplicate,
            holder: k.holder,
            notes: k.notes,
          })),
          history: vehicle.history.map((h) => ({
            id: h.id,
            status: h.status,
            note: h.note,
            userName: h.userName,
            createdAt: h.createdAt.toISOString(),
          })),
        }}
        role={session.user.role}
      />
    </AppShell>
  );
}
