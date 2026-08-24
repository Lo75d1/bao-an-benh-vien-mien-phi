import { pathToFileURL } from "node:url";
import { evaluateDiet } from "@suat-an/nutrition-engine";
import { DietMealStatus, Prisma, PrismaClient } from "@prisma/client";

const DAY_MS = 24 * 60 * 60 * 1000;

function hospitalDate(now = new Date()): Date {
  const vietnam = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return new Date(Date.UTC(vietnam.getUTCFullYear(), vietnam.getUTCMonth(), vietnam.getUTCDate()));
}

function mondayOfCurrentWeek(now = new Date()): Date {
  const today = hospitalDate(now);
  const day = today.getUTCDay() || 7;
  return new Date(today.getTime() - (day - 1) * DAY_MS);
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

function atVietnamTime(date: Date, hour: number, minute = 0): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hour - 7, minute));
}

function demoMealStatus(mealDate: Date, cutoffTime: string, serviceTime: string, now: Date, intentionallyIncomplete = false): DietMealStatus {
  const [cutoffHour, cutoffMinute] = cutoffTime.split(":").map(Number);
  const [serviceHour, serviceMinute] = serviceTime.split(":").map(Number);
  const cutoffAt = atVietnamTime(mealDate, cutoffHour, cutoffMinute).getTime();
  const serviceAt = atVietnamTime(mealDate, serviceHour, serviceMinute).getTime();
  if (now.getTime() >= serviceAt + 60 * 60 * 1000) return intentionallyIncomplete ? "PREPARED" : "SERVED";
  if (now.getTime() >= serviceAt) return "PREPARED";
  if (now.getTime() >= cutoffAt) return "PREPARING";
  return "PLANNED";
}

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function demoVariation(...parts: number[]): number {
  const hash = parts.reduce((value, part) => (value * 31 + part + 17) % 997, 23);
  return hash % 21 - 10;
}

export async function seedDemo(prisma: PrismaClient, now = new Date()): Promise<void> {
  const [departments, mealTypes, dietTypes, users, warehouse, foods] = await Promise.all([
    prisma.department.findMany({ where: { code: { in: ["NOI", "NGOAI"] } } }),
    prisma.mealType.findMany({ where: { code: { in: ["SANG", "TRUA", "CHIEU"] } }, orderBy: { sortOrder: "asc" } }),
    prisma.dietType.findMany({ where: { code: { in: ["COM_THUONG", "CHAO", "DTD"] } }, orderBy: { sortOrder: "asc" } }),
    prisma.user.findMany({ where: { email: { in: ["dietitian@demo.local", "nurse@demo.local", "kitchen@demo.local"] } } }),
    prisma.warehouse.findUnique({ where: { code: "TONG" } }),
    prisma.food.findMany({
      where: { OR: [
        { nameNormalized: { contains: "gao te" } }, { nameNormalized: { contains: "thit heo" } },
        { nameNormalized: { contains: "thit ga" } }, { nameNormalized: { contains: "ca loc" } },
        { nameNormalized: { contains: "trung ga" } }, { nameNormalized: { contains: "rau muong" } },
        { nameNormalized: { contains: "bi do" } }, { nameNormalized: { contains: "dau an" } },
        { nameNormalized: { contains: "sua tuoi" } },
      ] },
      orderBy: { nameNormalized: "asc" },
      take: 9,
      select: { id: true, name: true, wastePercent: true, energyKcal: true, proteinG: true, lipidG: true, glucidG: true },
    }),
  ]);

  const departmentByCode = new Map(departments.map((item) => [item.code, item]));
  const userByEmail = new Map(users.map((item) => [item.email, item]));
  const noi = departmentByCode.get("NOI");
  const ngoai = departmentByCode.get("NGOAI");
  const dietitian = userByEmail.get("dietitian@demo.local");
  const nurse = userByEmail.get("nurse@demo.local");
  const kitchen = userByEmail.get("kitchen@demo.local");
  if (!noi || !ngoai || !dietitian || !nurse || !kitchen || !warehouse || mealTypes.length !== 3 || dietTypes.length !== 3 || foods.length < 3) {
    throw new Error("Seed nền chưa đầy đủ; hãy chạy seed.ts trước seed demo.");
  }

  await prisma.department.update({ where: { id: noi.id }, data: { publicToken: "khoa-noi" } });
  await prisma.department.update({ where: { id: ngoai.id }, data: { publicToken: "khoa-ngoai" } });
  await prisma.departmentMembership.upsert({
    where: { userId_departmentId: { userId: nurse.id, departmentId: noi.id } },
    create: { userId: nurse.id, departmentId: noi.id },
    update: {},
  });

  const weekStart = mondayOfCurrentWeek(now);
  const mealsByKey = new Map<string, { id: string; eventId: string; dietTypeId: string }>();

  for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
    const mealDate = new Date(weekStart.getTime() + dayIndex * DAY_MS);
    for (let mealIndex = 0; mealIndex < mealTypes.length; mealIndex += 1) {
      const mealType = mealTypes[mealIndex];
      const eventId = `demo-event-${dateKey(mealDate)}-${mealType.code.toLowerCase()}`;
      const event = await prisma.mealEvent.upsert({
        where: { mealDate_mealTypeId: { mealDate, mealTypeId: mealType.id } },
        create: { id: eventId, mealDate, mealTypeId: mealType.id, status: "PLANNED" },
        update: {},
      });

      for (let dietIndex = 0; dietIndex < dietTypes.length; dietIndex += 1) {
        const dietType = dietTypes[dietIndex];
        const selectedFoods = [0, 1, 2].map((offset) => foods[(dayIndex + mealIndex + dietIndex + offset) % foods.length]);
        const baseGrams = dietType.code === "CHAO" ? [70, 55, 45] : dietType.code === "DTD" ? [90, 70, 80] : [120, 85, 100];
        const grams = baseGrams.map((value, foodIndex) => Math.max(20, value + demoVariation(dayIndex, mealIndex, dietIndex, foodIndex)));
        const items = selectedFoods.map((food, index) => ({
          foodId: food.id,
          itemName: food.name,
          dishName: index < 2 ? `${mealType.name} · Món chính` : `${mealType.name} · Món kèm`,
          grams: grams[index],
          wastePercent: food.wastePercent ?? 0,
        }));
        const totals = Object.fromEntries(["energyKcal", "proteinG", "lipidG", "glucidG"].map((key) => {
          const values = selectedFoods.map((food) => food[key as "energyKcal" | "proteinG" | "lipidG" | "glucidG"]);
          if (values.some((value) => value === null)) return [key, null];
          return [key, Number(values.reduce<number>((sum, value, index) => sum + (value as number) * grams[index] / 100, 0).toFixed(2))];
        }));
        const evaluation = evaluateDiet({ ...totals, sodiumMg: null, potassiumMg: null, waterG: null, meals: 1 }, null);
        const intentionallyIncomplete = dayIndex === 0 && mealIndex === 0 && dietIndex === 0;
        const status = demoMealStatus(mealDate, mealType.cutoffTime, mealType.serviceTime, now, intentionallyIncomplete);
        const [cutoffHour, cutoffMinute] = mealType.cutoffTime.split(":").map(Number);
        const cutoffAt = atVietnamTime(mealDate, cutoffHour, cutoffMinute);
        const menuApproved = cutoffAt.getTime() <= now.getTime();
        const approvedAt = menuApproved ? new Date(cutoffAt.getTime() - 30 * 60 * 1000) : null;
        const id = `demo-meal-${dateKey(mealDate)}-${mealType.code.toLowerCase()}-${dietType.code.toLowerCase()}`;
        const meal = await prisma.dietMeal.upsert({
          where: { mealEventId_dietTypeId: { mealEventId: event.id, dietTypeId: dietType.id } },
          create: {
            id,
            mealEventId: event.id,
            dietTypeId: dietType.id,
            feedingRoute: dietType.feedingRoute,
            menuSnapshotJson: json({ version: 1, items }),
            evaluationJson: json(evaluation),
            approvedAt,
            approvedById: menuApproved ? dietitian.id : null,
            status,
            internalNote: dietIndex === 1 ? "Bếp lưu ý độ mềm và nhiệt độ khi chia suất." : null,
            patientVisibleNote: dietIndex === 2 ? "Suất ăn hạn chế đường, phục vụ theo chỉ định của khoa." : null,
          },
          update: {
            feedingRoute: dietType.feedingRoute,
            menuSnapshotJson: json({ version: 1, items }),
            evaluationJson: json(evaluation),
            approvedAt,
            approvedById: menuApproved ? dietitian.id : null,
            status,
            internalNote: dietIndex === 1 ? "Bếp lưu ý độ mềm và nhiệt độ khi chia suất." : null,
            patientVisibleNote: dietIndex === 2 ? "Suất ăn hạn chế đường, phục vụ theo chỉ định của khoa." : null,
          },
        });
        const milestoneAt = status === "SERVED" || status === "PREPARED" ? atVietnamTime(mealDate, Number(mealType.serviceTime.slice(0, 2)), Number(mealType.serviceTime.slice(3))) : atVietnamTime(mealDate, Number(mealType.cutoffTime.slice(0, 2)), Number(mealType.cutoffTime.slice(3)));
        await prisma.auditLog.upsert({
          where: { id: `demo-kitchen-status-${id}` },
          create: { id: `demo-kitchen-status-${id}`, entityType: "DietMeal", entityId: meal.id, action: "KITCHEN_STATUS_CHANGE", actorId: kitchen.id, actorName: kitchen.displayName, afterJson: json({ status }), reason: "Dữ liệu demo theo khung giờ bữa ăn", createdAt: milestoneAt },
          update: { entityId: meal.id, actorId: kitchen.id, actorName: kitchen.displayName, afterJson: json({ status }), createdAt: milestoneAt },
        });
        if (status === "SERVED") {
          for (const kind of ["MEAL_PHOTO", "FOOD_SAMPLE"] as const) await prisma.mealEvidence.upsert({
            where: { id: `demo-evidence-${kind.toLowerCase()}-${id}` },
            create: { id: `demo-evidence-${kind.toLowerCase()}-${id}`, dietMealId: meal.id, kind, storagePath: `demo/bua-an/${id}-${kind.toLowerCase()}.jpg`, uploadedById: kitchen.id, uploadedAt: milestoneAt, note: kind === "MEAL_PHOTO" ? "Ảnh bữa ăn demo." : "Mẫu lưu bữa ăn demo." },
            update: { dietMealId: meal.id, kind, uploadedById: kitchen.id, uploadedAt: milestoneAt },
          });
        }
        mealsByKey.set(`${dateKey(mealDate)}:${mealType.code}:${dietType.code}`, { id: meal.id, eventId: event.id, dietTypeId: dietType.id });
      }

      for (const [departmentIndex, department] of [noi, ngoai].entries()) {
        const reportId = `demo-report-${dateKey(mealDate)}-${mealType.code.toLowerCase()}-${department.code.toLowerCase()}`;
        const report = await prisma.servingReport.upsert({
          where: { departmentId_mealEventId: { departmentId: department.id, mealEventId: event.id } },
          create: { id: reportId, departmentId: department.id, mealEventId: event.id, submittedById: nurse.id, submittedAt: atVietnamTime(mealDate, 4 + mealIndex * 4, 30), status: "SUBMITTED", note: departmentIndex === 0 ? "Khoa đã rà soát số suất trong ca trực." : "Đã tổng hợp theo buồng bệnh." },
          update: { submittedById: nurse.id, submittedAt: atVietnamTime(mealDate, 4 + mealIndex * 4, 30), status: "SUBMITTED", note: departmentIndex === 0 ? "Khoa đã rà soát số suất trong ca trực." : "Đã tổng hợp theo buồng bệnh." },
        });
        for (let dietIndex = 0; dietIndex < dietTypes.length; dietIndex += 1) {
          const dietType = dietTypes[dietIndex];
          const quantity = 8 + departmentIndex * 3 + dietIndex * 2 + ((dayIndex + mealIndex) % 3);
          await prisma.servingReportLine.upsert({
            where: { servingReportId_dietTypeId: { servingReportId: report.id, dietTypeId: dietType.id } },
            create: { servingReportId: report.id, dietTypeId: dietType.id, quantity, internalNote: dietIndex === 1 ? "Ưu tiên chia suất mềm trước." : null, patientVisibleNote: dietIndex === 0 ? "Suất ăn được giao tập trung tại khoa." : null },
            update: { quantity, internalNote: dietIndex === 1 ? "Ưu tiên chia suất mềm trước." : null, patientVisibleNote: dietIndex === 0 ? "Suất ăn được giao tập trung tại khoa." : null },
          });
        }
      }

      for (const dietType of dietTypes) {
        const totals = await prisma.servingReportLine.aggregate({
          where: { dietTypeId: dietType.id, servingReport: { mealEventId: event.id, status: "SUBMITTED" } },
          _sum: { quantity: true },
        });
        await prisma.dietMeal.update({
          where: { mealEventId_dietTypeId: { mealEventId: event.id, dietTypeId: dietType.id } },
          data: { servingsPlanned: totals._sum.quantity ?? 0 },
        });
      }
    }
  }

  const todayKey = dateKey(hospitalDate(now));
  const fallbackKey = dateKey(weekStart);
  const additionMeal = mealsByKey.get(`${todayKey}:TRUA:CHAO`) ?? mealsByKey.get(`${fallbackKey}:TRUA:CHAO`)!;
  const receivedMeal = mealsByKey.get(`${todayKey}:CHIEU:COM_THUONG`) ?? mealsByKey.get(`${fallbackKey}:CHIEU:COM_THUONG`)!;
  await prisma.lateMealAddition.upsert({
    where: { id: "demo-addition-pending" },
    create: { id: "demo-addition-pending", departmentId: noi.id, mealEventId: additionMeal.eventId, dietTypeId: additionMeal.dietTypeId, quantity: 2, reason: "Khoa tiếp nhận thêm người bệnh sau giờ chốt.", submittedById: nurse.id, submittedAt: new Date(now.getTime() - 20 * 60 * 1000), kind: "SUPPLEMENT", ackStatus: "PENDING" },
    update: { departmentId: noi.id, mealEventId: additionMeal.eventId, dietTypeId: additionMeal.dietTypeId, quantity: 2, reason: "Khoa tiếp nhận thêm người bệnh sau giờ chốt.", submittedById: nurse.id, kind: "SUPPLEMENT", ackStatus: "PENDING", ackById: null, ackAt: null, kitchenNote: null },
  });
  await prisma.lateMealAddition.upsert({
    where: { id: "demo-addition-received" },
    create: { id: "demo-addition-received", departmentId: ngoai.id, mealEventId: receivedMeal.eventId, dietTypeId: receivedMeal.dietTypeId, quantity: 1, reason: "Bổ sung suất sau can thiệp.", submittedById: nurse.id, submittedAt: new Date(now.getTime() - 90 * 60 * 1000), kind: "SUPPLEMENT", ackStatus: "RECEIVED", ackById: kitchen.id, ackAt: new Date(now.getTime() - 60 * 60 * 1000), kitchenNote: "Bếp đã tiếp nhận và bổ sung vào xe suất ăn." },
    update: { departmentId: ngoai.id, mealEventId: receivedMeal.eventId, dietTypeId: receivedMeal.dietTypeId, quantity: 1, reason: "Bổ sung suất sau can thiệp.", submittedById: nurse.id, kind: "SUPPLEMENT", ackStatus: "RECEIVED", ackById: kitchen.id, ackAt: new Date(now.getTime() - 60 * 60 * 1000), kitchenNote: "Bếp đã tiếp nhận và bổ sung vào xe suất ăn." },
  });

  const inventoryMeal = mealsByKey.get(`${todayKey}:TRUA:COM_THUONG`) ?? mealsByKey.get(`${fallbackKey}:TRUA:COM_THUONG`)!;
  const inventoryTransactions = [
    { id: "demo-inventory-in", type: "IN" as const, occurredAt: new Date(now.getTime() - 2 * DAY_MS), note: "Nhập thực phẩm tươi cho tuần vận hành mẫu.", relatedDietMealId: null, lines: foods.slice(0, 3).map((food, index) => ({ id: `demo-in-line-${index}`, food, quantity: 18000 + index * 3500, unitPrice: 24000 + index * 5000 })) },
    { id: "demo-inventory-out", type: "OUT" as const, occurredAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), note: "Xuất kho theo thực đơn bữa trưa.", relatedDietMealId: inventoryMeal.id, lines: foods.slice(0, 3).map((food, index) => ({ id: `demo-out-line-${index}`, food, quantity: 6200 + index * 900, unitPrice: null })) },
  ];
  for (const transaction of inventoryTransactions) {
    await prisma.inventoryTransaction.upsert({
      where: { id: transaction.id },
      create: { id: transaction.id, warehouseId: warehouse.id, type: transaction.type, occurredAt: transaction.occurredAt, createdById: kitchen.id, note: transaction.note, relatedDietMealId: transaction.relatedDietMealId },
      update: { warehouseId: warehouse.id, type: transaction.type, occurredAt: transaction.occurredAt, createdById: kitchen.id, note: transaction.note, relatedDietMealId: transaction.relatedDietMealId, status: "ACTIVE", voidedById: null, voidedAt: null, voidedReason: null },
    });
    for (const line of transaction.lines) {
      await prisma.inventoryTransactionLine.upsert({
        where: { id: line.id },
        create: { id: line.id, transactionId: transaction.id, foodId: line.food.id, itemName: line.food.name, quantity: line.quantity, unit: "g", unitPrice: line.unitPrice },
        update: { transactionId: transaction.id, foodId: line.food.id, itemName: line.food.name, quantity: line.quantity, unit: "g", unitPrice: line.unitPrice },
      });
    }
  }
  await prisma.document.upsert({
    where: { id: "demo-inventory-document" },
    create: { id: "demo-inventory-document", transactionId: "demo-inventory-in", kind: "BILL", storagePath: "demo/chung-tu/phiếu-nhap-kho-mau.pdf", note: "Đường dẫn minh họa; không chứa chứng từ thật." },
    update: { transactionId: "demo-inventory-in", kind: "BILL", storagePath: "demo/chung-tu/phiếu-nhap-kho-mau.pdf", note: "Đường dẫn minh họa; không chứa chứng từ thật." },
  });

  const today = hospitalDate(now);
  await prisma.patientNote.upsert({
    where: { id: "demo-patient-note-received" },
    create: { id: "demo-patient-note-received", departmentId: noi.id, mealDate: today, note: "Xin khoa hỗ trợ suất cháo mềm trong bữa chiều.", contactName: "Người nhà", status: "RECEIVED", ipHash: "demo-public-note-received" },
    update: { departmentId: noi.id, mealDate: today, note: "Xin khoa hỗ trợ suất cháo mềm trong bữa chiều.", contactName: "Người nhà", status: "RECEIVED", reviewedById: null, reviewedAt: null, reviewNote: null, ipHash: "demo-public-note-received" },
  });
  await prisma.patientNote.upsert({
    where: { id: "demo-patient-note-approved" },
    create: { id: "demo-patient-note-approved", departmentId: ngoai.id, mealDate: today, note: "Suất ăn dễ dùng, xin duy trì món mềm cho bữa kế tiếp.", contactName: "Người bệnh", status: "APPROVED", reviewedById: nurse.id, reviewedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000), reviewNote: "Khoa đã xác nhận và chuyển bếp tham khảo.", ipHash: "demo-public-note-approved" },
    update: { departmentId: ngoai.id, mealDate: today, note: "Suất ăn dễ dùng, xin duy trì món mềm cho bữa kế tiếp.", contactName: "Người bệnh", status: "APPROVED", reviewedById: nurse.id, reviewedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000), reviewNote: "Khoa đã xác nhận và chuyển bếp tham khảo.", ipHash: "demo-public-note-approved" },
  });

  console.log(`Demo seed: tuần ${weekStart.toISOString().slice(0, 10)}, token khoa: khoa-noi, khoa-ngoai`);
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    await seedDemo(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
