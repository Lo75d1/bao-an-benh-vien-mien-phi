# 19 — THÊM QUẢN LÝ BỮA ĂN (MealType) VÀO CÀI ĐẶT HỆ THỐNG

> Chỉ dẫn cho agent triển khai (Codex). Việc gọn, làm dứt điểm một lần.

## 1. Kết quả rà code

**Giao diện KHÔNG hardcode 3 bữa** — đã đọc động từ bảng `MealType`:
```
grep -rnE '"(Sáng|Trưa|Chiều)"' src/   →  không có kết quả
```
Vấn đề nằm ở chỗ khác:

1. `scripts/seed.ts` chỉ tạo **3 bữa**: `SANG 05:00/06:30` · `TRUA 09:00/11:30` · `CHIEU 14:00/17:00`.
2. **`/quan-tri` chỉ cho SỬA GIỜ của các bữa đã có** — `admin-forms.tsx:18` chỉ `mealTypes.map(...)` rồi render 2 ô `time`. **Không có form tạo bữa mới, không có vô hiệu hoá.**

→ Bệnh viện phục vụ **4–5 bữa** (thêm "Phụ sáng", "Tối", "Ăn đêm"…) **không tự thêm được**, phải sửa thẳng DB.

**Bất đối xứng cần sửa:** `DietType` (mã chế độ) đã có đủ **tạo / sửa / vô hiệu** (`saveDietTypeAction`, `dietTypeStatusAction`, `diet-type-table.tsx`), còn `MealType` thì không có gì.

## 2. Phải làm

Thêm mục **"Bữa ăn"** trong `/quan-tri` (Cài đặt hệ thống), **làm y hệt khuôn của "Mã chế độ" đang có** — tái dùng `DataTable` + Dialog + pattern action sẵn có, **KHÔNG dựng khuôn mới**:

| Chức năng | Chi tiết |
|---|---|
| **Tạo bữa** | `code` (duy nhất, in hoa không dấu), `name` (hiển thị), `cutoffTime`, `serviceTime`, `sortOrder` |
| **Sửa** | các trường trên |
| **Vô hiệu / kích hoạt lại** | đổi `status` ACTIVE ↔ INACTIVE, **lý do bắt buộc** |
| **Xóa cứng** | **KHÔNG** — theo hiến chương, chỉ vô hiệu |

**Kiểm tra đầu vào:**
- `code` không trùng; `cutoffTime` / `serviceTime` đúng dạng `HH:mm`; **`cutoffTime` phải TRƯỚC `serviceTime`**.
- `sortOrder` quyết định thứ tự hiển thị khắp app (lịch, thực đơn, báo suất, bếp) — bữa mới phải chèn đúng chỗ theo giờ.
- Ghi **`AuditLog`** cho mọi thao tác (cùng transaction), như `DietType` đang làm.

## 3. Điểm cần cẩn thận

- **Vô hiệu hoá bữa KHÔNG được làm hỏng lịch sử.** Các `MealEvent` / `DietMeal` / `ServingReport` đã có của bữa đó vẫn phải xem được ở lịch cũ và báo cáo; chỉ **ngừng tạo mới** từ lúc vô hiệu.
- **Thêm bữa mới KHÔNG hồi tố quá khứ.** `ensureEmptyMealEvents` chỉ tạo ô cho **hôm nay trở đi / trong cửa sổ nhập liệu**; **không** sinh ô cho những ngày đã qua.
- Mọi màn đã đọc động rồi, nhưng phải **kiểm lại với 5 bữa** xem bố cục có vỡ không: lịch tuần (thêm hàng), `/thuc-don` (thêm cột bữa — xem tài liệu 13), `/quan-ly` (thêm tab bữa), `/bao-suat`, `/bep`.
- Giao diện theo **tài liệu 15** (token, phông serif, mật độ) và **tài liệu 18** (không cuộn trang) — **không tạo file CSS mới**.

## 4. Nghiệm thu

- `npm run build` + `typecheck` + `lint` sạch; `npm test` xanh.
- Vào `/quan-tri` → thêm bữa **"Phụ chiều" 14:30 / 15:30** → **không sửa code nào**, bữa mới tự xuất hiện đúng thứ tự ở: **Lịch tuần · Thực đơn · Báo suất · Bếp · Điều hành**.
- Vô hiệu một bữa → bữa đó **ngừng xuất hiện ở ngày mới**, nhưng **lịch sử cũ vẫn còn nguyên**.
- Tạo bữa có `cutoffTime` sau `serviceTime` → **bị chặn** kèm thông báo rõ.
- `AuditLog` ghi đủ người / thời điểm / trước-sau / lý do.
