# 11 — BÊ UI TÍNH KHẨU PHẦN TỪ 2598 + SỬA LUỒNG "NHIỀU MÃ"

> Chỉ dẫn cho agent triển khai (Codex). Đọc kèm `AGENTS.md`, `10-ui-ux-guidelines.md`.
> **Đây là việc SỬA, không phải làm mới.** Có 2 lỗi đang gây khó chịu thật sự — mô tả kèm bằng chứng bên dưới.

---

## LỖI 1 — Đang TỰ DỰNG LẠI thay vì BÊ UI có sẵn

**Hiện trạng sai:** `apps/meal-service/src/components/menu-editor.tsx` là một editor **tự viết mới**, chỉ *bắt chước* giao diện 2598 (đặt class `ration-workbench`, `ration-layout-2598`) nhưng **mất gần hết chức năng**: chỉ có cây món đơn giản + ô tìm kiếm + bảng gram.

**Bản gốc đã có sẵn, đầy đủ, đang chạy production** tại `../web-m2-rap/src/app/tinh-khau-phan/`:

| File | Dòng | Vai trò |
|---|---|---|
| `MealInput.tsx` | **1024** | **TRÁI TIM** — nhập khẩu phần: cây bữa→món→thực phẩm, tìm kiếm có bộ lọc (loại TP, nguồn, nhóm; món theo nhóm/tuổi/bệnh/bữa), nhập tay, thuốc, chế độ `recall24h`/`menu` |
| `types.ts` | 154 | `Row`, `DishNode`, `MealNode`, `buildTree()`, `makeRow()`, `mealOrder()` |
| `MenuFoodSearch.tsx` | 238 | Ô tìm thực phẩm/món — props sạch: `{kind, onPickFood, onPickDish, placeholder}` |
| `RationDetail.tsx` | 161 | Bảng chi tiết khẩu phần |
| `DietCodeComparison.tsx` | 204 | So mã chế độ → đạt/thiếu/vượt |
| `EnergyDistribution.tsx` | 120 | Phân bố năng lượng |
| `ExchangeUnits.tsx` | 19 | Đơn vị chuyển đổi |
| `ShoppingList.tsx` | 57 | Danh sách đi chợ |
| `Calculator.tsx` | 446 | Khung ghép các mảnh trên (tham khảo cách lắp) |

### YÊU CẦU
**BÊ (port) các file trên sang app báo ăn — KHÔNG viết lại từ đầu.** Copy nguyên cấu trúc/JSX/CSS, chỉ sửa ĐÚNG 3 chỗ để chạy được trong app này:

1. **Nguồn dữ liệu**: bản 2598 tự lưu `localStorage` (`loadRows`/`saveRows` trong `types.ts`) và tự fetch API tìm kiếm.
   → Trong app báo ăn: dữ liệu vào/ra qua **props + server action** của `DietMeal` đang chọn. Bỏ localStorage.
2. **Tìm kiếm**: trang `/thuc-don` hiện nạp **toàn bộ** 3.719 foods + 7.369 dishes rồi truyền xuống client (nặng).
   → Thêm **API route tìm kiếm** (`/api/foods/search`, `/api/dishes/search`, có phân trang/limit) rồi cho `MenuFoodSearch` gọi vào, giống cách 2598 làm. KHÔNG bơm cả bảng xuống client.
3. **Import logic**: `@/lib/nutrient-fields`, `./quantity`, `./exchange-units`, `./ration-detail`, `matchRecommendation`… **đã được port sẵn** vào `@suat-an/nutrition-engine` (xem `packages/nutrition-engine/src/index.ts`).
   → Trỏ import sang engine. **KHÔNG port lại logic tính, KHÔNG sửa engine.**

**Định dạng dữ liệu phải giữ NGUYÊN:** UI sau khi bê vẫn phải xuất ra đúng `MenuItemInput` (`{foodId, itemName, dishName, grams, wastePercent, nutrients}`) như `src/lib/menu-logic.ts` đang dùng, để `approveMenuAction` và `menuSnapshotJson` không đổi.

Phần nào của 2598 KHÔNG hợp bệnh viện (hồ sơ cá nhân, biểu đồ tăng trưởng WHO, xuất báo cáo cá nhân, nhiều ngày) thì **bỏ**, đừng cố nhét vào.

---

## LỖI 2 — Chế độ "Nhiều mã" KHÔNG NHẬP ĐƯỢC (đây là cái làm lên thực đơn không bao giờ xong)

**Bằng chứng trong code** — `apps/meal-service/src/app/(app)/thuc-don/page.tsx`:
```
mode === "single"   → <MenuEditor …>            // CÓ ô nhập, có Duyệt
mode === "multiple" → <MultiCodeMenuBoard …>    // CHỈ ĐỌC: gộp danh sách đi chợ, KHÔNG có ô nhập, KHÔNG có nút Duyệt
```
`MultiCodeMenuBoard` chỉ nhận `items` đã lưu để tính đi chợ → **không nhập được gì**. Muốn nhập buộc phải quay về "Một mã", làm từng mã một.

**Thực tế nghiệp vụ: một bữa có 9–15 mã chế độ ăn.** Làm từng mã = 9–15 vòng chọn mã → dựng món → duyệt. Không thể xong nổi.

### YÊU CẦU
Trong **một màn duy nhất**, cho một bữa (ngày × bữa × đường nuôi), NVDD phải:

1. **Thấy TẤT CẢ mã chế độ của bữa đó cùng lúc** — không phải chọn từng mã, không phải rời màn.
2. **Dựng một thực đơn nền MỘT LẦN**, rồi **"Áp dụng cho các mã đã chọn"** (tick nhiều mã → copy sang cùng lúc).
   *Lý do: đa số mã dùng chung nền món, chỉ khác định lượng hoặc thay vài món.*
3. **Chỉnh riêng từng mã ngay tại chỗ**: sửa gram / thay-bỏ vài thực phẩm — inline, không điều hướng đi đâu.
4. **Đánh giá từng mã hiện song song** (đạt/thiếu/vượt theo ngưỡng RIÊNG của từng mã, lấy `dietType.dietCodeRef`), để thấy ngay mã nào chưa đạt. Thiếu ngưỡng → `—`.
5. **Duyệt hàng loạt** các mã đã đạt (một thao tác), nhưng **mỗi mã vẫn đóng băng snapshot riêng + ghi AuditLog riêng** như hiện nay.

Bỏ kiểu chuyển tab "Một mã / Nhiều mã" nếu nó buộc người dùng nhảy qua lại. Nếu vẫn giữ 2 chế độ thì **"Nhiều mã" BẮT BUỘC phải nhập và duyệt được**, không được chỉ để xem.

---

## RÀNG BUỘC (không được phá)

- **KHÔNG đổi** hợp đồng server action đang có (`approveMenuAction`, `saveTemplateAction`, `deleteTemplateAction`) — tên action + tên field giữ nguyên. Duyệt hàng loạt thì gọi lặp/ bọc thêm, KHÔNG viết lại luồng duyệt.
- **KHÔNG đổi** `schema.prisma` / migration / `packages/nutrition-engine`.
- **Snapshot đã duyệt là bất biến** — giữ nguyên luật hiện tại (`approveDietMeal` từ chối ghi đè).
- **Thiếu dữ liệu → `—`**, tuyệt đối không đoán số, không hiện 0 giả.
- Ghi `AuditLog` cho mỗi lần duyệt (như hiện tại).
- **Mật độ cao** (phần mềm bệnh viện, desktop ~1280px): bảng dòng thấp, chữ ~13px, ít khoảng trắng — đồng bộ với `/quan-ly`, `/quan-tri`, `/bao-suat` đã làm.
- Chỉ đụng `/thuc-don` + component của nó + API search mới. **KHÔNG** đụng `/quan-ly`, `/quan-tri`, `/bao-suat`, `/bep`, `/kho`, `/bao-cao`, `/ho-so`, `/k`.
- KHÔNG commit secret. KHÔNG sửa `../web-m2-rap` (chỉ ĐỌC để bê).

## NGHIỆM THU

- `npm run build` + `npm run typecheck -w @suat-an/meal-service` + `npm run lint -w @suat-an/meal-service` sạch; `npm test` xanh.
- Thử thật: một bữa có ≥3 mã → dựng nền 1 lần → áp cho nhiều mã → chỉnh gram riêng → duyệt hàng loạt → mỗi mã có snapshot riêng.
- Trả lời rõ trong tóm tắt: **đã BÊ những file nào từ 2598** (liệt kê), sửa gì để chạy được, và **"Nhiều mã" giờ nhập + duyệt được ra sao**.
