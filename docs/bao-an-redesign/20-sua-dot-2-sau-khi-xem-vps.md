# 20 — SỬA ĐỢT 2 (sau khi chủ dự án xem bản trên VPS)

> Chỉ dẫn cho agent triển khai (Codex). 5 việc, làm hết. Đọc kèm `12`, `15`, `16`, `18`.

---

## A. BẾP KHÔNG THẤY THỰC ĐƠN — nghiêm trọng nhất

**Hiện trạng:** `app/(app)/bep/page.tsx:45` — bảng bếp chỉ có `Chế độ ăn · Suất gốc · Bổ sung · Tổng · Tiến độ · [nút]`.
**Không có thực đơn, bấm vào mã chế độ cũng không mở gì.** → Người nấu **không biết phải nấu món gì**, phải mò sang màn khác.

**Phải làm:**
1. Thêm cột **"Thực đơn"** tóm tắt ngay trên bảng: tên các món, dạng gọn (`Cơm · Cá thu kho · Canh bí đỏ · Rau luộc`), quá dài thì cắt + `…`.
2. **Bấm vào mã chế độ → mở Dialog** gồm:
   - Danh sách **món** và **thực phẩm + định lượng/suất**;
   - **Tổng khối lượng cần nấu** = định lượng × số suất (gốc + bổ sung);
   - Ghi chú dòng thực phẩm (nếu có), cảnh báo thiếu `%thải bỏ`;
   - Ghi chú bệnh nhân **đã duyệt** liên quan.
3. Chưa có thực đơn duyệt → hiện **`—` + cảnh báo "Chưa có thực đơn duyệt"** (không để trống trơn).
4. **Tái dùng Dialog chi tiết đã có ở `/quan-ly`** (tài liệu 12) — **KHÔNG dựng popup thứ ba**.

---

## B. THANH TIẾN TRÌNH — DÙNG CHUNG TOÀN HỆ THỐNG

Thanh `Báo suất → Bếp chuẩn bị → Phục vụ → ↻ bữa kế` (tài liệu 12 §1b) **không được chỉ nằm ở admin**.

- Tách thành **một component dùng chung**, hiển thị trên **mọi màn nghiệp vụ**: `/quan-ly`, `/bao-suat`, `/bep`, `/thuc-don`, `/lich`.
- **Cùng một logic thời gian** ở tài liệu 16 — **cấm viết bộ logic giờ thứ hai**.
- Mỗi vai **nhấn mạnh chặng của mình** (điều dưỡng: chặng Báo suất; bếp: chặng Chuẩn bị/Phục vụ; dinh dưỡng: hạn lên thực đơn) nhưng **vẫn thấy đủ cả vòng** để nắm thời gian chung.
- Đặt ngay dưới header, cao gọn (≤ 56px), không chiếm chỗ dữ liệu.

---

## C. HẾT CUỘN LỒNG CUỘN

**Hiện trạng:** trong CSS có **34 vùng cuộn** (`overflow: auto/scroll`) rải rác → nhiều thanh cuộn lồng nhau, kéo rất khó chịu. Ngoài ra ở `/thuc-don`, **thanh lệnh dưới đè lên bảng** (dòng "Đang thêm vào: Sáng › Món 1" che mất tiêu đề cột).

**Phải làm:**
1. Theo **tài liệu 18**: trang **không cuộn**; **mỗi màn chỉ MỘT vùng cuộn chính** (+ tối đa một panel phụ cuộn riêng nếu là bố cục 2 cột).
2. **Rà và gỡ** các `overflow` thừa (34 chỗ → giữ đúng những chỗ cần).
3. **Thanh cố định (header / thanh lệnh dưới) tuyệt đối không được che nội dung**: vùng cuộn phải chừa `padding-bottom` đúng bằng chiều cao thanh lệnh.
4. Bảng cuộn ngang phải cuộn **trong khung của nó**, không đẩy cả trang.

---

## D. MẬT ĐỘ KIỂU VIỆT NAM + CÓ ICON

Chủ dự án: *"thưa thế này bên trời Âu mới dùng; VN thì cứ sát sát nhau và có icon thì tốt."*

1. **Nén khoảng cách** (áp cho mọi màn, xem thêm tài liệu 15):
   - Hàng bảng **32–36px** (đang thoáng hơn nhiều).
   - Padding ô **4px 8px**; khoảng cách giữa các khối **8–12px** (không 24–32px).
   - Bỏ các dòng mô tả dài lặp lại mỗi lần vào màn (vd *"Chọn một bữa, nhập số suất và gửi ngay trong cùng một bàn làm việc."*) — chuyển thành tooltip hoặc bỏ hẳn.
   - Thẻ chỉ số: gộp thành **một dải ngang gọn**, không mỗi số một thẻ to.
2. **Dùng icon (lucide) ở khắp nơi có thể**, kèm chữ (không thay chữ bằng icon trơn ở chỗ quan trọng):
   - Nhãn cột / tiêu đề khối: 🕐 giờ · 👥 suất · 🍽 bữa · 🧾 thực đơn · 📦 kho · ⚠ cảnh báo.
   - Nút hành động: icon + chữ ngắn.
   - Trạng thái: chấm màu + icon nhỏ.
   - Icon **≤ 16px** để không phá mật độ; icon trang trí đặt `aria-hidden`.
3. Mục tiêu đo được: **cùng một màn hình phải chứa nhiều hơn ~40% số dòng dữ liệu** so với hiện tại.

---

## E. DỮ LIỆU DEMO PHẢI GIỐNG BỆNH VIỆN + ĐƠN VỊ ĐO

**Hiện trạng:** panel "Đi chợ" ở `/bep` đang ra **"7up, sprite"**, **"ALMOND BUTTER COSTCO"**, **"Anchor Whipping Cream"**, **"Bánh ăn dặm Wakodo"** — bốc ngẫu nhiên từ bảng 3.719 thực phẩm, nhìn như đơn hàng siêu thị, không phải suất ăn bệnh viện.

1. `scripts/seed-demo.ts`: chọn thực phẩm theo **danh sách trắng hợp bệnh viện** (gạo, thịt/cá, rau củ, dầu ăn, gia vị, sữa…), **không random toàn bảng**.
2. **Đơn vị đo**: đang hiện `6.195 g` (tức 6.195 gam) — khó đọc. Quy tắc: **≥ 1000 g thì đổi sang kg, 1 số lẻ** (`6,2 kg`); dưới 1000 g giữ `g`. Áp cho cả `/bep` và panel đi chợ ở `/thuc-don`.

---

## F. THANH CUỘN NẰM LỬNG GIỮA MÀN + PHÍ HAI BÊN

**Hiện trạng:** thanh cuộn **không nằm ở mép màn hình** mà lơ lửng khoảng ¾ bề ngang. Nguyên nhân: **chính phần tử bị giới hạn bề ngang lại là phần tử cuộn**, nên thanh cuộn vẽ ở mép hộp bên trong:

```
.workspace                max-width: 1280px
.menu-page / .audit-page  max-width: 1280px
.management-page          max-width: 1536px
.multiple-workspace-page  max-width: 1536px
.serving-workspace        max-width: 1540px
```
Trên màn 1920: hộp 1536 → nội dung chỉ chiếm x≈192…1728, **bỏ trống ~192px mỗi bên**, thanh cuộn rơi vào giữa màn.
Ngoài ra **4 giá trị khác nhau (1280 / 1536 / 1540)** → mỗi trang một bề ngang, lại là bệnh "mỗi trang mỗi kiểu". `.workspace` còn bị **định nghĩa trùng 2 lần** trong `globals.css`.

**Phải làm:**
1. **Tách vai trò**: phần tử **cuộn** phải **rộng hết khung** (`width: 100%`), còn `max-width` (nếu cần) đặt ở **lớp con bên trong**:
   ```
   .scroll-pane  { width: 100%; overflow-y: auto; }   /* thanh cuộn ở đúng mép */
     .pane-inner { width: 100%; padding: 0 16px; }    /* nội dung */
   ```
2. **Bỏ giới hạn 1280/1536/1540 cho các màn dữ liệu** — màn nghiệp vụ **dùng hết bề ngang** (chỉ chừa padding hai bên ~16–20px). Chủ dự án yêu cầu **tận dụng toàn màn hình**; cắt 1280 trên màn 1920 là **phí ~640px**.
   *(Chỉ trang đăng nhập và trang bệnh nhân `/k/[token]` mới cần giới hạn bề ngang cho dễ đọc.)*
3. **Gộp còn MỘT quy tắc bề ngang duy nhất** cho mọi màn nghiệp vụ; **xóa định nghĩa `.workspace` trùng lặp**.
4. Giảm padding thừa: `.workspace` đang `padding: 2.25rem 2rem 4rem` (36px trên, **64px dưới**) → còn khoảng `12px 16px`.

**Nghiệm thu:** mở bất kỳ màn nghiệp vụ nào ở 1920×1080 → **thanh cuộn nằm sát mép phải màn hình**, nội dung chạy gần hết bề ngang, không còn 2 dải trắng hai bên.

## Ràng buộc & nghiệm thu

- KHÔNG đổi nghiệp vụ, server action, schema, `nutrition-engine`, quyền. Trừ mục A/B là thêm **hiển thị**, và mục E là sửa **seed demo**.
- Không tạo file CSS mới; theo token/phông ở **tài liệu 15**.
- Nghiệm thu:
  - `/bep`: thấy tên món ngay trên bảng; bấm mã → Dialog có món + định lượng + **tổng khối lượng cần nấu**.
  - Thanh tiến trình xuất hiện ở **cả 5 màn**, cùng chặng, cùng giờ.
  - Mỗi màn **chỉ một thanh cuộn**; thanh lệnh dưới không che nội dung.
  - Cùng độ phân giải, số dòng nhìn thấy **tăng ≥ 40%**.
  - Đi chợ demo toàn **thực phẩm bệnh viện**; khối lượng lớn hiện **kg**.
  - `npm run build` + `typecheck` + `lint` sạch; `npm test` xanh.
