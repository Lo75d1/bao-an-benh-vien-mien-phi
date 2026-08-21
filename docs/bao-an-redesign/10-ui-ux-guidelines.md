# 10 — UI/UX Guidelines (chuẩn taste riêng của dự án)

> Dùng **CÙNG** Taste Skill (`npx skills add Leonxlnx/taste-skill`, xem [09](09-codex-milestones.md) Setup).
> Taste Skill lo **"đẹp chung, chống slop"**. File này lo **"đúng dự án"** — brand, dữ liệu lâm sàng,
> quy ước không-đoán-số, thiết bị theo role. Khi hai bên vênh: **file này thắng** cho phần dự án (màu, quy ước dữ liệu, thiết bị).

## 0. Tiêu chí "không ngô ngô" (định nghĩa)
Một màn ĐẠT khi: (a) trả lời ngay "giờ tôi cần làm gì?", (b) không thừa card/nút trang trí, (c) mật độ thông tin hợp ngữ cảnh (nhân viên = dày, bệnh nhân = thoáng), (d) trạng thái/thiếu-dữ-liệu hiển thị trung thực, (e) một hành động chính rõ ràng mỗi màn.

## 1. Thương hiệu & màu
- Chủ đạo: **xanh rêu `#123c36`** (header, nhấn mạnh). Phụ: teal `#0f6e56` / `#085041`.
- Nền vùng tổng/nhấn nhẹ: `#e1f5ee` / `#eaf3ee`. Nền trang: giấy trung tính (không trắng gắt).
- Trạng thái ngữ nghĩa: **Đạt** = teal/xanh; **Cảnh báo/Vượt** = amber `#b45309`; **Chưa đạt/Thiếu** = đỏ trầm (không đỏ chói); **Thiếu dữ liệu** = xám + "—".
- **Không** dùng gradient loè, đổ bóng nặng, màu neon.

## 2. Typography
- Weight: **`font-semibold` / `font-medium`** cho tiêu đề; **BỎ `font-black`**.
- Số liệu: **`tabular-nums`** (cột số thẳng hàng).
- Bệnh nhân (mobile): chữ **to, tương phản cao** (người bệnh, người lớn tuổi).

## 3. Bố cục & thành phần
- Thẻ: `rounded-2xl border border-[#123c36]/10-15` (viền mảnh). **BỎ `border-2`**, khung dày.
- Bảng: hairline, header nền nhạt, dòng tổng nhấn nền (`#e1f5ee`). Số phải `tabular-nums`, canh phải.
- Vùng làm việc bảng rộng: `max-w-7xl`.
- **Progressive disclosure**: mặc định hiện thông tin quan trọng; chi tiết (đánh giá từng chỉ tiêu, audit, chứng từ) ẩn sau `▸ Xem chi tiết`.
- **Một hành động chính/màn**: nút chính nổi bật (teal đặc), phụ là outline/ghost.

## 4. Quy ước dữ liệu (BẮT BUỘC — đặc thù dự án)
- **Thiếu dữ liệu → "—" + cảnh báo, TUYỆT ĐỐI KHÔNG đoán/không hiện 0 giả.** (Áp cho đi chợ, đánh giá, tổng dinh dưỡng.)
- Đánh giá chỉ tiêu: hiện **từng dòng** đạt/vượt/thiếu (không "đỏ cả bữa"); bấm mở mới thấy `actual vs target`.
- Số suất: tách **đã chốt** và **bổ sung** (không gộp thành một số) — vd `20 (+1) = 21`.
- Trạng thái bữa: chip rõ ràng theo lifecycle (Dự kiến/Đã chốt/Đang chuẩn bị/Đã chuẩn bị/Đã phục vụ).
- Ảnh/chứng từ = đính kèm, **không** hiển thị như trạng thái.

## 5. Thiết bị theo role (BẮT BUỘC)
- **NURSE / DIETITIAN / KITCHEN / ADMIN → desktop** (~1280px): bảng nhiều cột, mật độ cao, phím tắt/tab nhập nhanh.
- **Bệnh nhân → mobile** (~375px): một màn = một việc, chữ to, tối giản.
- Mobile nhân viên (nếu có) = **rút gọn workflow**, không phải thu nhỏ bảng desktop.

## 6. Biểu đồ (nếu có)
- **Không dùng thư viện chart ngoài** — SVG/div thuần (theo skill `dataviz`).
- Palette CVD-safe; **không dual-axis** (2 thang đo → 2 mini-chart).
- Không vẽ khi 0% dữ liệu — hiện ghi chú thay vì biểu đồ rỗng.

## 7. Trạng thái rỗng / tải / lỗi
- Empty state có **hướng dẫn hành động** ("Chưa có thực đơn — [Lên thực đơn]"), không để trống trơn.
- Lỗi DB/tải: degrade nhẹ nhàng (vd chưa cấu hình storage → ảnh nằm im, **không** sập trang).

## 8. Khả dụng (accessibility, ngữ cảnh bệnh viện)
- Tương phản đạt WCAG AA; vùng bấm mobile ≥ 44px.
- Nhãn tiếng Việt rõ, tránh viết tắt lạ; icon luôn kèm chữ.

## Checklist review UI (Claude dùng khi duyệt PR Codex)
- [ ] Đã cài + dùng Taste Skill? AGENTS.md có ghi setup?
- [ ] Trả lời được "giờ tôi cần làm gì?" trong 1 cái liếc?
- [ ] Màu/typography theo brand (không font-black, không border dày, không neon)?
- [ ] Thiếu dữ liệu ra "—", không đoán số?
- [ ] Đánh giá theo từng chỉ tiêu + progressive disclosure?
- [ ] Đúng thiết bị (nhân viên desktop / bệnh nhân mobile)?
- [ ] Ảnh là evidence, không phải state?
- [ ] Empty/lỗi có xử lý tử tế?
