import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const courtCount = await prisma.court.count();
  if (courtCount > 0) {
    console.log(`Skipping seed, ${courtCount} courts already exist.`);
    return;
  }

  await prisma.court.createMany({
    data: [{ name: "Court 1" }, { name: "Court 2" }],
  });
  console.log("Seeded 2 courts.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
