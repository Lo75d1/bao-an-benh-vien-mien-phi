# 05 — Information Architecture (điều hướng theo role)

Nguyên tắc: **mỗi role đăng nhập trả lời ngay "giờ tôi cần làm gì?"** → màn chủ = **việc tiếp theo**, không phải dashboard đầy đủ. **Lịch tuần là trục điều hướng** chung.

## Trang công khai / Login / Bệnh nhân
- `/` — landing công khai + **ô đăng nhập nhân viên**.
- `/k/[token]` — **màn bệnh nhân theo khoa** (QR). Hiển thị: bữa đang phục vụ/gần nhất + ảnh + bữa tiếp theo + thông tin cho phép + **mức đáp ứng chỉ tiêu** + ô gửi ghi chú. Không đăng nhập.
- Sau đăng nhập → điều hướng theo role tới **màn "việc tiếp theo"** (dưới).

## NURSE (Điều dưỡng) — cực kỳ đơn giản
```
[Hôm nay ▸ Báo suất]   [Lịch]   [Ghi chú chờ duyệt]
```
- **Màn chủ = Báo suất hôm nay** (khoa mình, không chọn khoa): danh sách mã chế độ → gõ số suất → Lưu.
- Lịch: tuần này + tuần sau (chuẩn bị trước); chỉ **xem** thực đơn.
- Sau giờ chốt: nút **Báo bổ sung** (lý do bắt buộc).
- Ghi chú bệnh nhân khoa mình: Duyệt / Từ chối.
- *Không* quản lý từng giường/bệnh nhân.

## DIETITIAN (NVDD)
```
[Hôm nay ▸ Thực đơn cần lên]   [Lịch]   [Lên thực đơn]   [Kho mẫu]   [Kho]   [Báo cáo]
```
- **Màn chủ = Việc dinh dưỡng**: (ngày × chế độ) nào **chưa có thực đơn duyệt** → nhắc làm.
- Lên thực đơn: chọn ngày → bữa → ăn thường/sonde → mã chế độ → tạo mới/lấy mẫu/copy → chỉnh món/khối lượng → **engine đánh giá** → sửa nếu chưa đạt → **Duyệt & chuyển sang báo ăn**.
- Kho mẫu cá nhân: lưu/lấy/copy/xóa (nếu chưa dùng).
- Tham gia nghiệp vụ kho (nhập/xuất) khi cần.

## KITCHEN (Bếp)
```
[Bữa tiếp theo]   [Lịch]   [Đi chợ]   [Kho]   [Bằng chứng]
```
- **Màn chủ = Bữa tiếp theo cần xử lý**: "Bữa trưa — 11:00 — còn 40 phút — 82 suất". Bên trong: số suất theo mã, thực đơn, ghi chú (đã duyệt), **suất bổ sung** (cảnh báo), nguyên liệu/xuất dự kiến, trạng thái.
- Workflow: nhận suất → Chuẩn bị → **Thực xuất kho** → Đã chuẩn bị → Đã phục vụ.
- Lưu: ảnh bữa ăn, ảnh lưu mẫu, ảnh nhập kho, hóa đơn.
- Đi chợ: menu × suất (thiếu dữ liệu → "—").

## ADMIN (Admin/Trưởng khoa) — đặt luật + quản lý + kiểm tra + ngoại lệ
```
[Hôm nay]  [Lịch]  [Nhân sự & tài khoản]  [Mã chế độ / quy định]  [Kho]  [Báo cáo]  [Cài đặt]
```
- **Hôm nay**: tổng quan trạng thái các bữa/khoa, cảnh báo (chế độ chưa có thực đơn, suất bổ sung chờ, kho lệch).
- Lịch: chọn/xem **mọi tuần** (role khác chỉ tuần này + tuần sau).
- Cài đặt: số ngày NVDD/điều dưỡng nhập trước · giờ chốt/giờ ăn · **bật/tắt sonde** · **số kho (Mode A/B)** · role duyệt kho · rule.

## Lịch tuần (dùng chung mọi role)
- Cột = ngày (T2..CN), hàng = bữa (Sáng/Trưa/Chiều…).
- Ô = `MealEvent`: hiện **trạng thái** + chip **mã chế độ** + **số suất** + cờ (chưa có thực đơn / có suất bổ sung / đã phục vụ).
- Bộ lọc **Ăn thường / Sonde** (khi bật sonde).
- ADMIN duyệt tuần bất kỳ; NURSE/DIETITIAN/KITCHEN: tuần hiện tại + tuần sau.

## Quy ước điều hướng
- **Progressive disclosure**: mặc định hiện thông tin quan trọng; "Xem chi tiết" mới mở đầy đủ (đánh giá chỉ tiêu, audit, chứng từ).
- **Thiết bị**: NURSE/DIETITIAN/KITCHEN/ADMIN → **desktop** (bảng rộng, mật độ cao). Chỉ **bệnh nhân → mobile** (chữ to, 1 màn/1 việc).
