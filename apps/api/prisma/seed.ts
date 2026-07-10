import { PrismaClient, Role, PricingType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

const SERVICE_ITEMS: { name: string; type: PricingType; price: number }[] = [
  { name: 'Roupa social (lavada e passada)', type: PricingType.POR_KG, price: 50 },
  { name: 'Roupa social (somente passada)', type: PricingType.POR_KG, price: 37 },
  { name: 'Dia a dia (lavada e passada)', type: PricingType.POR_KG, price: 27 },
  { name: 'Dia a dia (somente passada)', type: PricingType.POR_KG, price: 17 },
  { name: 'Dia a dia (somente lavada)', type: PricingType.POR_KG, price: 14 },
  { name: 'Vestido longo (festa)', type: PricingType.POR_UNIDADE, price: 70 },
  { name: 'Vestido curto', type: PricingType.POR_UNIDADE, price: 35 },
  { name: 'Terno simples', type: PricingType.POR_UNIDADE, price: 40 },
  { name: 'Terno forrado ou linho', type: PricingType.POR_UNIDADE, price: 60 },
  { name: 'Paletó', type: PricingType.POR_UNIDADE, price: 30 },
  { name: 'Jaqueta de couro', type: PricingType.POR_UNIDADE, price: 50 },
  { name: 'Jaqueta comum', type: PricingType.POR_UNIDADE, price: 30 },
  { name: 'Sobretudo', type: PricingType.POR_UNIDADE, price: 35 },
  { name: 'Tênis', type: PricingType.POR_UNIDADE, price: 30 },
  { name: 'Cobre leito simples', type: PricingType.POR_UNIDADE, price: 35 },
  { name: 'Cobre leito grande', type: PricingType.POR_UNIDADE, price: 42 },
  { name: 'Cobre leito c/ porta travesseiro', type: PricingType.POR_UNIDADE, price: 45 },
  { name: 'Edredon solteiro', type: PricingType.POR_UNIDADE, price: 35 },
  { name: 'Edredon casal', type: PricingType.POR_UNIDADE, price: 45 },
  { name: 'Edredon queen', type: PricingType.POR_UNIDADE, price: 50 },
  { name: 'Edredon king', type: PricingType.POR_UNIDADE, price: 60 },
  { name: 'Porta travesseiro', type: PricingType.POR_UNIDADE, price: 10 },
  { name: 'Avulsos (calças/camisas)', type: PricingType.POR_UNIDADE, price: 15 },
  { name: 'Travesseiro', type: PricingType.POR_UNIDADE, price: 30 },
  { name: 'Jalecos', type: PricingType.POR_UNIDADE, price: 15 },
  { name: 'Mochila de costa (rodinha)', type: PricingType.POR_UNIDADE, price: 50 },
  { name: 'Tapete comum', type: PricingType.POR_UNIDADE, price: 30 },
  { name: 'Tapete peludo', type: PricingType.POR_UNIDADE, price: 75 },
  { name: 'Tapetes especiais', type: PricingType.POR_UNIDADE, price: 38 },
  { name: 'Camisa só passar', type: PricingType.POR_UNIDADE, price: 9 },
  { name: 'Camiseta só passar', type: PricingType.POR_UNIDADE, price: 5 },
];

async function main() {
  // ── Operator user ──────────────────────────────────────────────────────────
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? 'Admin';

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, name },
    create: { email, name, passwordHash, role: Role.OPERATOR },
  });
  console.log(`✅ Operator upserted — ${email}`);

  // ── Service items ──────────────────────────────────────────────────────────
  for (const item of SERVICE_ITEMS) {
    await prisma.serviceItem.upsert({
      where: { name: item.name },
      update: { type: item.type, price: new Decimal(item.price) },
      create: { name: item.name, type: item.type, price: new Decimal(item.price) },
    });
  }
  console.log(`✅ ${SERVICE_ITEMS.length} service items upserted`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
