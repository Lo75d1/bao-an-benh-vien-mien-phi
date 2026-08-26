import { createReadStream } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { PrismaClient, Role } from "@prisma/client";
import { hashPassword } from "../src/lib/password";
const prisma = new PrismaClient();
const dataDir = resolve(process.cwd(), "../../data/reference");
async function rows(file: string, flush: (batch: any[]) => Promise<void>) {
  const input = createInterface({
    input: createReadStream(resolve(dataDir, file), { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  let batch: any[] = [];
  let count = 0;
  for await (const line of input) {
    if (!line.trim()) continue;
    batch.push(JSON.parse(line));
    if (batch.length === 500) {
      await flush(batch);
      count += batch.length;
      batch = [];
    }
  }
  if (batch.length) {
    await flush(batch);
    count += batch.length;
  }
  console.log(`${file}: ${count} dòng`);
}
const pickFood = (x: any) => ({
  id: x.id,
  name: x.name,
  nameNormalized: x.nameNormalized,
  source: x.source,
  sourceCode: x.sourceCode,
  sourceNote: x.sourceNote,
  unit: x.unit,
  wastePercent: x.wastePercent,
  foodType: x.foodType,
  foodGroup: x.foodGroup,
  proteinOrigin: x.proteinOrigin,
  giLevel: x.giLevel,
  purinLevel: x.purinLevel,
  cholesterolLevel: x.cholesterolLevel,
  energyKcal: x.energyKcal,
  waterG: x.waterG,
  proteinG: x.proteinG,
  lipidG: x.lipidG,
  glucidG: x.glucidG,
  sodiumMg: x.sodiumMg,
  potassiumMg: x.potassiumMg,
  rawJson: x,
});
async function seedReference() {
  await rows("foods.jsonl", (batch) =>
    prisma.food
      .createMany({ data: batch.map(pickFood), skipDuplicates: true })
      .then(() => undefined),
  );
  await rows("dishes.jsonl", (batch) =>
    prisma.dish
      .createMany({
        data: batch.map((x) => ({
          id: x.id,
          name: x.name,
          nameNormalized: x.nameNormalized,
          source: x.source,
          sourceCode: x.sourceCode,
          totalWeightG: x.totalWeightG,
          servingUnit: x.servingUnit,
          isActive: x.isActive ?? true,
          rawJson: x,
        })),
        skipDuplicates: true,
      })
      .then(() => undefined),
  );
  await rows("dish_ingredients.jsonl", (batch) =>
    prisma.dishIngredient
      .createMany({
        data: batch.map((x) => ({
          id: x.id,
          dishId: x.dishId,
          foodId: x.foodId,
          foodNameRaw: x.foodNameRaw,
          quantityG: x.quantityG,
          sortOrder: x.sortOrder ?? 0,
          energyKcalRaw: x.energyKcalRaw,
        })),
        skipDuplicates: true,
      })
      .then(() => undefined),
  );
  await rows("food_aliases.jsonl", (batch) =>
    prisma.foodAlias
      .createMany({ data: batch, skipDuplicates: true })
      .then(() => undefined),
  );
  await rows("diet_codes.jsonl", (batch) =>
    prisma.dietCode
      .createMany({
        data: batch.map((x) => ({ ...x, rawJson: x })),
        skipDuplicates: true,
      })
      .then(() => undefined),
  );
  await rows("nutrition_recommendations.jsonl", (batch) =>
    prisma.nutritionRecommendation
      .createMany({
        data: batch.map((x) => ({
          id: x.id,
          ageGroup: x.ageGroup,
          gender: x.gender,
          physicalActivity: x.physicalActivity,
          rawJson: x,
        })),
        skipDuplicates: true,
      })
      .then(() => undefined),
  );
  await rows("child_growth_standards.jsonl", (batch) =>
    prisma.childGrowthStandard
      .createMany({
        data: batch.map((x) => ({
          id: x.id,
          standard: x.standard ?? x.type ?? "—",
          sex: x.sex,
          ageMonth: x.ageMonth,
          rawJson: x,
        })),
        skipDuplicates: true,
      })
      .then(() => undefined),
  );
}
async function seedFoundation() {
  for (const department of [
    { code: "NOI", name: "Khoa Nội" },
    { code: "NGOAI", name: "Khoa Ngoại" },
  ])
    await prisma.department.upsert({
      where: { code: department.code },
      create: department,
      update: { name: department.name },
    });
  for (const meal of [
    {
      code: "SANG",
      name: "Sáng",
      cutoffTime: "05:00",
      serviceTime: "06:30",
      feedingRoute: "NORMAL" as const,
      sortOrder: 10,
    },
    {
      code: "TRUA",
      name: "Trưa",
      cutoffTime: "09:00",
      serviceTime: "11:30",
      feedingRoute: "NORMAL" as const,
      sortOrder: 20,
    },
    {
      code: "CHIEU",
      name: "Chiều",
      cutoffTime: "14:00",
      serviceTime: "17:00",
      feedingRoute: "NORMAL" as const,
      sortOrder: 30,
    },
  ])
    await prisma.mealType.upsert({
      where: { code: meal.code },
      create: meal,
      update: meal,
    });
  const sondeServiceTimes = ["03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00", "23:30"];
  for (const [index, serviceTime] of sondeServiceTimes.entries()) {
    const serviceMinutes = Number(serviceTime.slice(0, 2)) * 60 + Number(serviceTime.slice(3));
    const cutoffMinutes = (serviceMinutes - 60 + 1440) % 1440;
    const cutoffTime = `${String(Math.floor(cutoffMinutes / 60)).padStart(2, "0")}:${String(cutoffMinutes % 60).padStart(2, "0")}`;
    const meal = { code: `SONDE_${index + 1}`, name: `Cữ Sonde ${index + 1}`, cutoffTime, serviceTime, feedingRoute: "SONDE" as const, sortOrder: 100 + index };
    await prisma.mealType.upsert({ where: { code: meal.code }, create: meal, update: meal });
  }
  for (const diet of [
    { code: "COM_THUONG", name: "Cơm thường", sortOrder: 10 },
    { code: "CHAO", name: "Cháo", sortOrder: 20 },
    { code: "DTD", name: "ĐTĐ", sortOrder: 30 },
    { code: "SONDE_TC", name: "Sonde tiêu chuẩn", feedingRoute: "SONDE" as const, sortOrder: 100 },
  ])
    await prisma.dietType.upsert({
      where: { code: diet.code },
      create: diet,
      update: diet,
    });
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const displayName = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || "Quản trị hệ thống";
  if (!email || !password) throw new Error("Thiếu BOOTSTRAP_ADMIN_EMAIL hoặc BOOTSTRAP_ADMIN_PASSWORD.");
  if (!email.includes("@")) throw new Error("BOOTSTRAP_ADMIN_EMAIL không hợp lệ.");
  if (password.length < 12) throw new Error("BOOTSTRAP_ADMIN_PASSWORD phải có ít nhất 12 ký tự.");
  const existingAdmin = await prisma.user.findUnique({ where: { email } });
  if (!existingAdmin) {
    await prisma.user.create({ data: { role: Role.ADMIN, email, displayName, passwordHash: hashPassword(password) } });
    console.log(`Đã tạo tài khoản quản trị khởi tạo: ${email}`);
  } else {
    console.log(`Tài khoản quản trị khởi tạo đã tồn tại: ${email}`);
  }
}
async function seedWarehouses() {
  for (const warehouse of [
    { code: "TONG", name: "Kho tổng", kind: "GENERAL" as const },
    { code: "BEP", name: "Kho bếp", kind: "KITCHEN" as const },
    { code: "SONDE", name: "Kho sonde", kind: "SONDE" as const },
  ]) {
    await prisma.warehouse.upsert({
      where: { code: warehouse.code },
      create: warehouse,
      update: { name: warehouse.name, kind: warehouse.kind },
    });
  }
  await prisma.appSetting.upsert({
    where: { key: "warehouseMode" },
    create: { key: "warehouseMode", valueJson: { mode: "A" } },
    update: {},
  });
}
async function main() {
  await seedReference();
  await seedFoundation();
  await seedWarehouses();
}
main().finally(() => prisma.$disconnect());
