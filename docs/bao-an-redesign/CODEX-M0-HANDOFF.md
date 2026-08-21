# CODEX — HANDOFF M0 (dán vào `codex exec`)

> Đây là brief để Codex chạy **milestone M0**. Claude sẽ review diff trước khi merge.
> Đọc kèm: [AGENTS.md](../../AGENTS.md), [09-codex-milestones.md](09-codex-milestones.md) (mục SETUP + M0),
> [02-target-architecture.md](02-target-architecture.md), [03-domain-model.md](03-domain-model.md).

## Vai trò
Bạn là agent triển khai. Làm ĐÚNG M0, KHÔNG làm lố sang M1+. Không tự chế nghiệp vụ/UX — theo docs.

## SETUP (làm đầu tiên)
1. `npx skills add Leonxlnx/taste-skill` và dùng cho mọi UI về sau.
2. Xác nhận Node ≥ 22, npm hoạt động.

## Phạm vi M0 (scaffold nền tảng — CHƯA làm nghiệp vụ suất ăn)
1. **Monorepo workspaces:** `package.json` gốc với `workspaces: ["packages/*","apps/*"]`.
2. **`packages/nutrition-engine`** (TS thuần, KHÔNG DB/React/`server-only`):
   - Port các hàm thuần từ `../web-m2-rap/src/lib/`: `nutrient-fields`, `quantity`, `exchange-units`,
     `matchRecommendation`→`recommendation`, `ration-detail`, `food-classify`, phần so-sánh của
     `DietCodeComparison`→`diet-evaluation` (trả đạt/vượt/thiếu từng chỉ tiêu), `buildKitchenShoppingList`→`shopping`.
   - Bỏ mọi import DB/React/server-only. Port test (`test:ration*`) chạy độc lập (tsx/vitest) — phải XANH.
   - Export gói `@suat-an/nutrition-engine`.
3. **`apps/meal-service`** (Next.js App Router + TS + Tailwind + Prisma + Postgres):
   - `prisma/schema.prisma` theo [03-domain-model.md](03-domain-model.md): User, Department, DepartmentMembership,
     MealType, DietType, MealEvent, DietMeal, ServingReport(+Line), LateMealAddition, MealEvidence, PatientNote,
     Warehouse, InventoryTransaction(+Line), Document, MenuTemplate(+Item), AppSetting, AuditLog
     + reference: Food, Dish, DishIngredient, DietCode, NutritionRecommendation, ChildGrowthStandard, FoodAlias.
     1 migration `init` sạch. **KHÔNG** model `DietOrder`/`MealOrderChangeRequest`/role `CLINICIAN`.
   - Auth/session (scrypt, `getSessionUser`) port từ `../web-m2-rap/src/lib/auth.ts`, 4 role: ADMIN/DIETITIAN/NURSE/KITCHEN.
   - Seed: nạp `data/reference/*.jsonl` (idempotent) + cấu hình mẫu (khoa Nội/Ngoại, bữa Sáng/Trưa/Chiều có giờ chốt,
     mã chế độ Cơm thường/Cháo/ĐTĐ) + 4 tài khoản demo (in mật khẩu). Seed **KHÔNG** import lib dính `server-only`.
4. **Docker Compose reproducible:** `app + db + migrate + seed` (mẫu ở `../web-m2-rap/compose*.yaml` + `08-migration-plan.md`).
   Pre-bake/pin Prisma engine để build không tải mạng lúc build. `docs/DEPLOY.md` ghi cách chạy.
5. Trang `/api/health` trả `{status:"ok"}`; homepage tạm (chưa cần nghiệp vụ).

## Khoảng trống data đã biết (xử lý ĐÚNG, đừng bịa)
`diet_codes.jsonl`, `nutrition_recommendations.jsonl`, `child_growth_standards.jsonl` hiện **RỖNG**
(xem [../data/reference/SOURCES.md](../../data/reference/SOURCES.md)). Ở M0: seed **CHẤP NHẬN file rỗng**
(không lỗi, bảng trống), engine đánh giá thiếu ngưỡng → trả "—". **KHÔNG** bịa mã chế độ. Việc bù 3 bảng
này làm sau (Claude xuất từ DB production).

## Acceptance (Claude sẽ kiểm)
- `docker compose up` → migrate + seed chạy; đăng nhập được 4 role; foods/dishes/ingredients nạp đủ.
- `nutrition-engine` build + test XANH độc lập (không cần DB).
- `/api/health` ok. Seed chạy 2 lần không lỗi (idempotent). **Không** vá tay khi deploy.
- Không có secret trong git; AGENTS.md + SETUP Taste Skill đã ghi trong repo.

## KHÔNG được làm
- KHÔNG làm nghiệp vụ M1+ (lịch/thực đơn/báo suất/bếp/kho) trong M0.
- KHÔNG sửa `../web-m2-rap` hay `../web` (chỉ đọc để port).
- KHÔNG tự merge/deploy/force-push. Xong → để nhánh + diff cho Claude review.

## Nộp kết quả
Nhánh `codex/m0-scaffold`. Báo: tóm tắt việc đã làm + lệnh test đã chạy + kết quả. Chờ Claude review.
