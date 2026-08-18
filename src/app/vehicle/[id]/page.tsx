import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { VehicleDetail } from "@/components/VehicleDetail";
import { phonesMatch } from "@/lib/phone";

export const dynamic = "force-dynamic";

export default async function VehiclePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: params.id },
    include: {
      keys: { orderBy: { createdAt: "asc" } },
      history: { orderBy: { createdAt: "desc" } },
      client: true,
    },
  });
  if (!vehicle) notFound();

  const allVehicles = await prisma.vehicle.findMany({ select: { status: true } });
  const counts = {
    AVAILABLE: allVehicles.filter((v) => v.status === "AVAILABLE").length,
    WORKSHOP: allVehicles.filter((v) => v.status === "WORKSHOP").length,
    RENTED: allVehicles.filter((v) => v.status === "RENTED").length,
  };

  // Клиент, привязанный к технике: сперва карточка в справочнике Client
  // (заводится при оформлении аренды), иначе — данные текущего арендатора,
  // сохранённые прямо на технике.
  const clientPhone = vehicle.client?.phone || vehicle.renterPhone || null;
  const clientFirstName = vehicle.client?.firstName || vehicle.renterFirstName || null;
  const clientLastName = vehicle.client?.lastName || vehicle.renterLastName || null;
  const clientEmail = vehicle.client?.email || vehicle.renterEmail || null;

  // Ищем должника из синхронизированного снапшота ravapi.eu, у которого
  // телефон совпадает с телефоном клиента этой техники. Из-за разных
  // форматов хранения номеров сравниваем по последним 9 цифрам.
  const debtor = clientPhone ? await loadDebtor(clientPhone) : null;

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
        client={
          clientPhone
            ? {
                id: vehicle.client?.id || null,
                firstName: clientFirstName,
                lastName: clientLastName,
                phone: clientPhone,
                email: clientEmail,
                notes: vehicle.client?.notes || null,
              }
            : null
        }
        debtor={
          debtor
            ? {
                id: debtor.id,
                currentBalance: debtor.currentBalance,
                balanceWithDeposits: debtor.balanceWithDeposits,
                dateOfFirstUnpaidPayoff: debtor.dateOfFirstUnpaidPayoff
                  ? debtor.dateOfFirstUnpaidPayoff.toISOString()
                  : null,
                dateOfLastUnpaidPayoff: debtor.dateOfLastUnpaidPayoff
                  ? debtor.dateOfLastUnpaidPayoff.toISOString()
                  : null,
                debtNotes: debtor.debtNotes,
                isContactedForDebt: debtor.isContactedForDebt,
                lastSyncedAt: debtor.lastSyncedAt.toISOString(),
                messages: debtor.messages.map((m) => ({
                  id: m.id,
                  target: m.target,
                  body: m.body,
                  status: m.status,
                  error: m.error,
                  sentBy: m.sentBy,
                  createdAt: m.createdAt.toISOString(),
                })),
              }
            : null
        }
        role={session.user.role}
      />
    </AppShell>
  );
}

async function loadDebtor(phone: string) {
  // В базе нет индекса по нормализованному телефону, поэтому сверяем
  // локально — таблица должников достаточно небольшая для этого.
  const debtors = await prisma.debtor.findMany({
    include: { messages: { orderBy: { createdAt: "desc" }, take: 10 } },
  });
  return debtors.find((d) => phonesMatch(d.phoneNumber, phone)) || null;
}
