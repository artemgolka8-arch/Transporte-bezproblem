import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Берём всю технику в статусе "В аренде", у которой ещё нет привязанной карточки клиента
  const vehicles = await prisma.vehicle.findMany({
    where: {
      status: "RENTED",
      clientId: null,
    },
  });

  console.log(`Найдено техники в аренде без карточки клиента: ${vehicles.length}`);

  let created = 0;
  let linked = 0;
  let skipped = 0;

  for (const v of vehicles) {
    const firstName = (v.renterFirstName || "").trim();
    const lastName = (v.renterLastName || "").trim();
    const phone = (v.renterPhone || "").trim();
    const email = v.renterEmail?.trim() || null;

    // Без телефона нельзя ни найти, ни создать карточку клиента (номер — уникальный ключ)
    if (!phone) {
      console.warn(
        `  Пропущено: "${v.code} — ${v.name}" — не заполнен телефон клиента, карточку создать нельзя`
      );
      skipped++;
      continue;
    }

    const client = await prisma.client.upsert({
      where: { phone },
      update: {
        // Не затираем существующие данные пустыми, только дополняем при отсутствии
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        email: email ?? undefined,
      },
      create: {
        firstName: firstName || "—",
        lastName: lastName || "—",
        phone,
        email,
      },
    });

    const wasJustCreated = client.createdAt.getTime() === client.updatedAt.getTime();
    if (wasJustCreated) created++;
    else linked++;

    await prisma.vehicle.update({
      where: { id: v.id },
      data: { clientId: client.id },
    });

    console.log(`  ${v.code} — ${v.name} → клиент ${client.firstName} ${client.lastName} (${client.phone})`);
  }

  console.log("");
  console.log(`Готово. Новых карточек клиентов создано: ${created}, привязано к существующим: ${linked}, пропущено: ${skipped}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
