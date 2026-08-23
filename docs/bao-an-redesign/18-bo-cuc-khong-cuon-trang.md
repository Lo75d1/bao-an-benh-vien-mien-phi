# 18 — BỐ CỤC "KHÔNG CUỘN TRANG" (app shell / console layout)

> Chỉ dẫn cho agent triển khai (Codex). Áp cho **tất cả màn nghiệp vụ**: `/quan-ly`, `/thuc-don`, `/bao-suat`, `/bep`, `/kho`, `/bao-cao`, `/lich`, `/quan-tri`.
> Đọc kèm `15-thong-nhat-giao-dien.md` (token, phông, mật độ).

## 1. Nguyên tắc

**Trang KHÔNG cuộn. Chỉ vùng dữ liệu bên trong cuộn.**
Đây là kiểu **app shell / console layout**: vỏ ứng dụng cao đúng một màn hình, phần khung (header, thanh công cụ, thanh lệnh) **đứng yên**, người dùng chỉ cuộn **trong bảng/danh sách**.

```
┌── header (cố định, không cuộn) ─────────────────────────┐
├── thanh ngữ cảnh + công cụ (cố định, 1 hàng) ───────────┤
│┌─ vùng dữ liệu (CHỖ DUY NHẤT ĐƯỢC CUỘN) ───┬─ panel phụ ┐│
││  sticky header bảng                        │  (cuộn     ││
││  … nhiều dòng …                            │   riêng)   ││
│└─ hàng TỔNG ghim đáy ───────────────────────┴────────────┘│
├── thanh lệnh dưới (cố định) ────────────────────────────┤
└─────────────────────────────────────────────────────────┘
```

## 2. Lỗi hiện tại — phí hơn nửa màn hình

Trên `/thuc-don?mode=multiple` (ảnh chụp VPS, màn 1920×1080) phần **trước khi thấy dữ liệu** gồm:
1. Tiêu đề trang 3 dòng: *"BÀN LÀM VIỆC DINH DƯỠNG / Lập và duyệt thực đơn / Chọn một hoặc nhiều mã…"*
2. Thẻ to riêng một khối: *"NGÀY × CHẾ ĐỘ CHƯA CÓ THỰC ĐƠN DUYỆT — 21 mục"*
3. Hàng toggle `Một mã | Nhiều mã` + wizard
4. Hàng *"Bữa đang xử lý"* + nút Chuyển việc
5. Hàng ngữ cảnh *"T2, 10/08 · Sáng · Ăn đường miệng…"*

→ Tốn **~600px**, xuống tới danh sách mã **chỉ còn thấy 2 mã** (trong khi một bữa có 9–15 mã), rồi phải **cuộn miết**.

## 3. Phải làm

### 3.1 Dựng khung một màn
- Vỏ ứng dụng: `height: 100dvh; display: flex; flex-direction: column; overflow: hidden`.
- Vùng nội dung: `flex: 1; min-height: 0;` **(bắt buộc có `min-height: 0` — thiếu nó là cả trang cuộn trở lại)**.
- Chỉ vùng dữ liệu đặt `overflow: auto`. Panel phụ (đi chợ / chi tiết) **cuộn độc lập**.
- Bảng: **`position: sticky` cho hàng tiêu đề**; **hàng "Tổng cộng" ghim đáy** vùng cuộn.
- Danh sách **> 50 dòng** thì virtualize.

### 3.2 Nén phần khung (gộp 5 khối trên còn 2 hàng)
- **Hàng 1 (ngữ cảnh + chuyển việc):** tên màn ngắn gọn + `Ngày · Bữa · Đường nuôi` + bộ chọn bữa + `Một mã | Nhiều mã` + wizard.
- **Hàng 2 (chỉ số + hành động):** `21 mục chưa duyệt`, `3 mã · 0 suất`, `Thông tin khuyến nghị`, `Tổng hợp đi chợ`.
- **BỎ** khối tiêu đề 3 dòng và thẻ "21 mục" chiếm nguyên một khối — biến thành **chip/badge nhỏ trên hàng 2**.
- Mô tả dài kiểu *"Chọn một hoặc nhiều mã chế độ để lên thực đơn…"* → **bỏ** hoặc đưa vào tooltip. Nhân viên dùng hằng ngày không đọc lại mỗi lần.
- Tổng chiều cao phần khung (header + 2 hàng + thanh lệnh dưới) **≤ 210px**.

### 3.3 Áp cho mọi màn
Cùng khuôn: header cố định → 1–2 hàng ngữ cảnh → vùng dữ liệu cuộn trong → thanh lệnh dưới cố định (nếu có).
Riêng **trang bệnh nhân `/k/[token]`** (mobile) **giữ cuộn bình thường** — không áp luật này.

## 4. Ràng buộc

- Chỉ đổi **bố cục/CSS**; KHÔNG đổi nghiệp vụ, server action, schema, `nutrition-engine`, quyền.
- KHÔNG tạo file CSS mới cho từng trang; dùng token + lớp dùng chung theo **tài liệu 15**.
- Vẫn giữ a11y: vùng cuộn phải **cuộn được bằng bàn phím**, sticky header không che focus, thanh lệnh cố định không che nội dung cuối.
- Không dùng chiều cao cố định bằng `px` cho vỏ (dùng `dvh`) để không vỡ trên laptop nhỏ.

## 5. Nghiệm thu

Kiểm ở **1920×1080** và **1366×768** (màn phổ biến ở bệnh viện):
- `document.documentElement.scrollHeight <= window.innerHeight` → **trang không có thanh cuộn dọc**.
- Ở `/thuc-don?mode=multiple`: nhìn thấy **≥ 8 mã chế độ** ngay khi mở, không cần cuộn trang.
- Ở `/quan-ly`: bảng khoa thấy **≥ 10 dòng**, hàng "Tổng cộng" **luôn nhìn thấy** ở đáy.
- Cuộn trong bảng: **tiêu đề cột đứng yên**.
- Phần khung ≤ **210px**; `npm run build` + `typecheck` + `lint` sạch; `npm test` xanh.
