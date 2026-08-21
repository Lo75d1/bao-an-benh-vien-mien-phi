# 08 — Migration Plan (sang repo mới, không phá data)

Điểm mấu chốt: **repo mới `suat-an-benh-vien` có DB RIÊNG, seed từ đầu.**
→ **Không có rủi ro phá dữ liệu production** của `web-m2-rap` (repo cũ giữ nguyên, không đụng).
"Migration" ở đây = **port khái niệm/logic + seed data nền**, không phải migrate dữ liệu chạy thật.

## Nguyên tắc
1. **`web-m2-rap` KHÔNG bị sửa** trong toàn bộ dự án này (trừ thư mục `docs/bao-an-redesign/`).
2. Repo mới **kế thừa schema đã kiểm chứng** (xem [03](03-domain-model.md)) — thiết kế sạch, không cần giữ hàng dữ liệu cũ.
3. Data nền (Food/Dish/DietCode…) **seed từ file jsonl công khai** (đã có ở `web-m2-rap/data/reference/` + trích từ offline JSON) → đưa vào `apps/meal-service/data/reference/`.
4. Deploy **reproducible**: đóng gói mọi bản vá vào repo (không vá tay trên VPS như bản demo cũ).

## Các bước port (Codex thực hiện theo milestone)

### P1. Trích `nutrition-engine` từ `web-m2-rap`
- Copy các file lib thuần: `nutrient-fields`, `quantity`, `exchange-units`, `matchRecommendation`→`recommendation`, `ration-detail`, `food-classify`, phần so-sánh của `DietCodeComparison`→`diet-evaluation`, `buildKitchenShoppingList`→`shopping`.
- **Bỏ mọi** `import "server-only"`, Prisma, React khỏi các file này. Nếu file lib cũ có dính DB → tách phần thuần ra.
- Port test tương ứng (`test:ration*`) → chạy độc lập.
- Kết quả: package `@suat-an/nutrition-engine` build + test xanh, không cần DB.

### P2. Data nền
- Đưa `foods.jsonl` (3.719), `dishes.jsonl` (7.369), `dish_ingredients.jsonl` (41.457), `diet_codes` (246), `nutrition_recommendations`, `child_growth_standards` vào repo mới.
- Script seed idempotent (như `import-reference-data.ts` cũ) — **kèm file `SOURCES.md` ghi nguồn VDD/RNI** (điều kiện công khai data).
- Seed cấu hình mẫu + tài khoản demo 4 role (in mật khẩu).

### P3. Schema mới (Prisma)
- Dựng schema theo [03](03-domain-model.md): `MealEvent, DietMeal, DietType, ServingReport(+Line), LateMealAddition, MealEvidence, PatientNote, Warehouse, InventoryTransaction(+Line), Document, MenuTemplate(+Item), AppSetting, AuditLog` + `User, Department, DepartmentMembership, MealType` + reference `Food/Dish/DishIngredient/DietCode/…`.
- Bỏ: `CLINICIAN`, `DietOrder`, `MealOrderChangeRequest` (thay bằng `LateMealAddition`).
- 1 migration `init` sạch (DB mới, không lo drift `food_aliases` như bản cũ — tạo đúng ngay từ đầu).

### P4. App theo milestone
- Xem [09](09-codex-milestones.md). Mỗi milestone 1 nhánh → PR → Claude review → merge.

## Bài học từ bản demo cũ (phải tránh lặp lại)
- **Prisma schema-engine**: pre-bake engine vào image hoặc pin version — **không** để build tự tải (đã từng treo mạng).
- **MTU**: ghi rõ trong `docs/DEPLOY.md` cách xử lý network build sandbox (MTU 1400) nếu gặp.
- **`server-only` trong seed script**: seed **không** được import lib dính `server-only` (đã từng lỗi tsx). Engine thuần giúp tránh việc này.
- **Không** `db push --accept-data-loss` để chữa cháy — schema `init` đúng ngay từ đầu.

## Quan hệ với web dinh dưỡng (tương lai, KHÔNG thuộc giai đoạn này)
- Nếu muốn web dinh dưỡng dùng chung engine: **publish** `@suat-an/nutrition-engine` lên npm từ monorepo → `web-m2-rap` cài vào thay bản lib nội bộ. Làm sau, có kiểm thử hồi quy riêng.
