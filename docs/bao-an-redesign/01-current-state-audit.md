# 01 — Current-State Audit (repo `web-m2-rap`)

Mục tiêu: xác định cái gì **tái dùng** cho repo mới, cái gì **thiết kế lại**.
Repo mới có DB riêng seed từ đầu → ta có tự do thiết kế schema, nhưng **kế thừa khái niệm đã kiểm chứng**.

## A. Tài sản mạnh (KEEP — bê nguyên khái niệm/code sang engine hoặc app)

| Thành phần | Vị trí | Ghi chú |
|---|---|---|
| Logic tính khẩu phần thuần | `src/lib/*.ts` (`nutrient-fields`, `quantity`, `exchange-units`, `matchRecommendation`, `ration-detail`, `food-classify`) | **Đã tách khỏi UI, có test** → lõi của `nutrition-engine`. |
| Đối chiếu mã chế độ ăn | `DietCodeComparison.tsx` + bảng `DietCode` (246 dòng, min/max 8 chỉ tiêu) | Chuyển phần so-sánh thành hàm thuần trong engine (đạt/vượt/thiếu). |
| Đi chợ (mua = ÷(1−%thải bỏ)) | `ShoppingList.tsx`, `kitchen-menu-snapshot.ts::buildKitchenShoppingList` | Mầm "xuất dự kiến"; thiếu dữ liệu → "—", không đoán. |
| Data nền | `Food`(3.719) `Dish`(7.369) `DishIngredient`(41.457) `DietCode`(246) `NutritionRecommendation` `ChildGrowthStandard` | Seed vào DB repo mới (công khai). |
| Auth/session | `src/lib/auth.ts` (scrypt, `getSessionUser`) | Bê sang, bỏ role `CLINICIAN`. |
| Scope theo khoa | `Department`, `DepartmentMembership` | Giữ nguyên ý tưởng. |
| Audit before/after | `MealOperationAudit` | Tổng quát hóa thành `AuditLog` phủ mọi nghiệp vụ. |
| Snapshot bất biến | `KitchenMenuItem.snapshotJson` | Đóng băng thực đơn khi duyệt → lịch sử không đổi. |
| Ảnh bằng chứng | cột `photo*` trên `KitchenMenuItem` + `meal-photo-storage.ts` | Tổng quát hóa thành `MealEvidence` (nhiều loại ảnh/chứng từ). |
| Khẩu phần đã lưu | `Ration`/`RationItem` | **Tái dùng làm KHO MẪU thực đơn cá nhân** (§VIII). |

## B. Backend vận hành đã có (REFACTOR — gộp về abstraction mới)

| Model hiện tại | Vai trò | Ánh xạ sang model mới |
|---|---|---|
| `MealType` | bữa + giờ chốt/giờ ăn | Giữ (thêm cấu hình). |
| `KitchenDietType` | mã chế độ vận hành (link `DietCode`) | → `DietType` (thêm `feedingRoute`). |
| `MealOrder` (khoa×ngày×bữa) | phiếu báo suất của 1 khoa | → `ServingReport`. |
| `MealOrderItem` (×chế độ, quantity) | số suất theo chế độ của khoa đó | → `ServingReportLine`. |
| `KitchenMenu` (ngày×bữa) | thực đơn 1 bữa | → **`MealEvent`** (thêm status lifecycle). |
| `KitchenMenuItem` (×chế độ, snapshot, approve, photo) | thực đơn 1 chế độ | → **`DietMeal`** (thêm servings cache, evaluation, note tách, status). |
| `MealOrderChangeRequest` | đề xuất *sửa* số qua duyệt | Thay bằng **`LateMealAddition`** (cộng thêm, KHÔNG sửa số đã chốt). |
| `PublicMealReport` | ghi chú/báo ăn qua QR | → **`PatientNote`** (gọn: xem + ghi chú có duyệt). |

## C. Không còn phù hợp (REMOVE / DEFER)
- `CLINICIAN` + `DietOrder` + `/chi-dinh-che-do-an` + cờ `ENABLE_DIET_ORDERS` → **DEFER** (bác sĩ qua HIS/EMR).
- UI vận hành cũ (`OperationsApp.tsx`, `/bao-suat-an`, `/bep`, `/quan-tri/suat-an`) → **REPLACE** (thiết kế lại; backend concepts giữ).

## D. Vấn đề của hệ hiện tại (lý do làm lại)
1. **Không có thực thể `DietMeal`** gom menu + số suất + đánh giá + trạng thái của 1 mã chế độ trong 1 bữa (spec §V).
2. **Đánh giá thực đơn chỉ chạy trong máy tính khẩu phần**, chưa gắn vào menu vận hành (§IX).
3. **Không có "suất bổ sung sau giờ chốt" đúng nghĩa** (§XI) — chỉ có change-request kiểu sửa số.
4. **Không có Kho** (§XIII-XIV).
5. **Không có lịch tuần** làm trục điều hướng (§IV).
6. **Không có "login = màn bệnh nhân"** (§III).
7. **Trạng thái rải rác**, chưa có lifecycle 5 bước (§VI).
8. **Note chung một field**, chưa tách internal/patient ở tầng data (§X).
9. **IA chưa thành một khối theo role** — trang vận hành chỉ vào được qua menu tài khoản; trang bệnh nhân đứng riêng.

## E. Kết luận
Backend + engine đã đủ chín để **kế thừa**; thứ cần làm lại là **abstraction (MealEvent→DietMeal), Kho, suất bổ sung, lịch tuần, IA/flow/wireframe theo role, và tách engine thành thư viện**.
