# 03 — Domain Model

> Tên model là **đề xuất**; Codex có thể giữ naming cũ nếu tốt hơn, miễn đúng quan hệ.
> Tất cả entity nghiệp vụ: **không hard-delete** (dùng `status` + `voided*`), **ghi `AuditLog`**.

## Sơ đồ quan hệ (rút gọn)

```
User ─< DepartmentMembership >─ Department ─(publicToken)→ QR bệnh nhân
                                    │
MealType ──┐                        │
           ▼                        ▼
        MealEvent (ngày × bữa) ──< DietMeal (× mã chế độ) >── DietType ──→ DietCode (rule 246)
           │                          │  │  │                    │
           │                          │  │  └─ menuSnapshotJson   └─ feedingRoute: NORMAL|SONDE
           │                          │  └─ evaluationJson (đạt/vượt/thiếu)
           │                          └─ servingsPlanned (Σ báo khoa) + status lifecycle
           │
   ServingReport (khoa × MealEvent) ──< ServingReportLine (× chế độ, quantity)   [nguồn số suất]
           │
   LateMealAddition (khoa × MealEvent × chế độ)  [cộng thêm sau chốt, KHÔNG sửa số gốc]
           │
   MealEvidence (× DietMeal)  ─ ảnh bữa/mẫu/chứng từ (đính kèm, KHÔNG phải state)
           │
   PatientNote (khoa × ngày)  ─ ghi chú bệnh nhân → điều dưỡng duyệt → bếp thấy

Warehouse ──< InventoryTransaction ──< InventoryTransactionLine >── Food(ref)
                     │
                     └─ Document (bill/hóa đơn/ảnh)

MenuTemplate ──< MenuTemplateItem            [kho mẫu cá nhân NVDD, xóa được nếu chưa dùng]
AppSetting                                    [cấu hình Admin]
AuditLog                                      [truy vết mọi nghiệp vụ, tầng backend]
DietCode / Food / Dish / DishIngredient       [DATA NỀN — reference, seed sẵn]
```

## Thực thể chính

### MealEvent — "Bữa trưa 18/08"
`id, mealDate(Date), mealTypeId, status, createdAt, updatedAt` · **unique(mealDate, mealTypeId)**
- Là **container** của nhiều `DietMeal`. Giờ chốt/giờ ăn suy từ `MealType`.
- `status` = **rollup** (suy ra) từ trạng thái các DietMeal, không phải nguồn.

### DietMeal — đơn vị lõi (spec §V), "Cơm thường trong bữa trưa 18/08"
`id, mealEventId, dietTypeId, feedingRoute, menuSnapshotJson?, approvedAt?, approvedById?,`
`servingsPlanned(Int, cache), evaluationJson?, status, internalNote?, patientVisibleNote?, voided*`
**unique(mealEventId, dietTypeId)**
- `menuSnapshotJson`: đóng băng thực đơn (thực phẩm + gram + %thải bỏ) lúc NVDD duyệt.
- `evaluationJson`: kết quả từ engine — `{ overall: "OK|WARN|FAIL", criteria: [{key, label, status, actual, target}] }` (§IX progressive disclosure).
- `servingsPlanned`: **materialize** = Σ `ServingReportLine.quantity` của (mealEvent × dietType), cập nhật khi có báo suất.
- `status`: lifecycle 5 bước (§VI) — xem dưới.
- **internalNote / patientVisibleNote tách ở tầng DATA** (§X) — không dựa frontend để giấu.

### Lifecycle `DietMeal.status` (§VI)
```
PLANNED → LOCKED → PREPARING → PREPARED → SERVED     (+ CANCELLED)
```
- **PLANNED**: đã có menu duyệt, trước giờ chốt, số suất đang cộng dồn.
- **LOCKED**: qua **giờ chốt chuẩn** (đường mềm) — số suất "chốt"; phát sinh thêm → `LateMealAddition`.
- **PREPARING / PREPARED / SERVED**: bếp đẩy tiến trình.
- Ảnh/chứng từ **không** phải state — là `MealEvidence`.
- *Quyết định:* đặt status ở **DietMeal** (bếp nấu theo mã chế độ) chứ không ở MealEvent; MealEvent hiện rollup.

### DietType — mã chế độ ăn vận hành
`id, code, name, feedingRoute(NORMAL|SONDE), dietCodeRefId?(→DietCode), sortOrder, status`
- `feedingRoute` = **sonde as attribute** (một abstraction). Lọc lịch sonde = lọc DietMeal theo route.
- `dietCodeRefId` nối tới rule đánh giá (246 dòng).

### ServingReport / ServingReportLine — số suất (nguồn)
- `ServingReport`: `id, departmentId, mealEventId, submittedById, submittedAt, status, note` · **unique(departmentId, mealEventId)**
- `ServingReportLine`: `id, servingReportId, dietTypeId, quantity` · **unique(servingReportId, dietTypeId)**
- Điều dưỡng báo cho **khoa mình**; hệ cộng lên `DietMeal.servingsPlanned` (toàn viện theo chế độ).

### LateMealAddition — suất bổ sung sau chốt (§XI)
`id, departmentId, mealEventId, dietTypeId, quantity, reason, submittedById, submittedAt,`
`kind(SUPPLEMENT|URGENT_POST_SERVE), ackStatus(PENDING|RECEIVED|INSUFFICIENT|SUBSTITUTE), ackById?, ackAt?, kitchenNote?`
- **CỘNG THÊM, KHÔNG sửa số đã chốt** — giữ cả hai để báo cáo (20 + 1 = 21).
- Bếp xử lý: Đã nhận / Không đủ / Cần thay thế.
- Sau khi bữa SERVED mà phát sinh → `kind=URGENT_POST_SERVE` (không reopen sửa lịch sử).

### MealEvidence — bằng chứng (§XII)
`id, dietMealId, kind(MEAL_PHOTO|FOOD_SAMPLE|STOCK_IN|INVOICE), storagePath, uploadedById, uploadedAt, note?`
- Bệnh nhân xem `MEAL_PHOTO` để **so sánh** thực đơn ↔ ảnh thật.

### PatientNote — ghi chú bệnh nhân (§X)
`id, departmentId, mealDate, note, contactName?, status(RECEIVED|APPROVED|REJECTED), reviewedById?, reviewedAt?, reviewNote?, ipHash?`
- Qua QR khoa, **không đăng nhập**, **không PII bắt buộc**. Điều dưỡng duyệt → bếp mới thấy note đã duyệt (cửa lọc chống spam).

### Kho (§XIII-XIV)
- `Warehouse`: `id, code, name, kind(GENERAL|KITCHEN|SONDE), status` — Mode A = 1 GENERAL; Mode B = KITCHEN + SONDE (cấu hình ở `AppSetting`).
- `InventoryTransaction`: `id, warehouseId, type(IN|OUT|ADJUST), occurredAt, createdById, note?, status, relatedDietMealId?` (header)
- `InventoryTransactionLine`: `id, transactionId, foodId?(→Food), itemName, quantity, unit, unitPrice?`
- `Document`: `id, transactionId, kind(BILL|INVOICE|PHOTO|OTHER), storagePath, note?` — chứng từ.
- **Xuất dự kiến** = tính từ menu × suất (engine `shopping.ts`) — **không lưu bảng riêng**, tính khi cần.
- **Thực xuất** = `InventoryTransaction type=OUT`. **Chênh lệch** = thực xuất − dự kiến (báo cáo).
- **AI đọc bill = tùy chọn**: chỉ pre-fill `InventoryTransactionLine`, không phải dependency.

### Kho mẫu cá nhân (§VIII)
- `MenuTemplate`: `id, ownerId, name, dietTypeId?, feedingRoute?, createdAt, updatedAt`
- `MenuTemplateItem`: `id, templateId, foodId?, itemName, grams, wastePercent?`
- **Xóa thật được** nếu chưa gắn vào DietMeal đã dùng (không có reference nghiệp vụ).

### Cấu hình & truy vết
- `AppSetting`: `key, valueJson` — số ngày NVDD/điều dưỡng nhập trước, giờ chốt/giờ ăn mặc định, bật/tắt sonde, warehouseMode, role duyệt kho…
- `AuditLog`: `id, entityType, entityId, action, actorId, actorName, beforeJson?, afterJson?, reason, createdAt` — **ghi trong cùng transaction** với thao tác. Phủ: thực đơn, báo suất, suất bổ sung, kho, chứng từ, mã chế độ, cấu hình, đổi trạng thái.

## Rule đánh giá (§IX) — quyết định (5)
- **Phase đầu:** engine đọc **8 cột min/max của `DietCode`** (năng lượng, P, L, G, natri, kali, nước, số bữa) → trả từng chỉ tiêu `đạt/vượt/thiếu`.
- **Chừa đường mở rộng:** thiết kế `evaluationJson` dạng danh sách `criteria[]` (không hard-code cứng UI). Sau này thêm bảng `DietRule (dietTypeId, metricKey, op, min, max)` để bổ sung chỉ tiêu (chất xơ, P:L:G, vi chất) mà không đổi UI.
