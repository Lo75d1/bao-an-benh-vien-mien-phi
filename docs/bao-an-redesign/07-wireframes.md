# 07 — Wireframes (thô — ưu tiên luồng, chưa cần đẹp)

Quy ước: `[nút]` · `‹chip/trạng thái›` · `▸` mở rộng chi tiết. Desktop ~1280px; Mobile ~375px.
Nhân viên = **desktop**; bệnh nhân = **mobile**.

## A. Bệnh nhân (MOBILE) — `/k/[token]` (§III)
```
┌───────────────────────────┐
│ Khoa Nội · Bữa trưa       │
│ 11:00 · Đang phục vụ      │
├───────────────────────────┤
│ [ẢNH BỮA ĂN THẬT]         │  ← MealEvidence MEAL_PHOTO
│                           │
│ Thực đơn (Cơm thường):    │
│  • Cơm • Cá kho • Canh…   │
│  Mức chỉ tiêu: ‹Đạt›      │  ← evaluationJson.overall
├───────────────────────────┤
│ Bữa tiếp theo: Chiều 17:00│
│  (chưa có → phần đánh giá │
│   mở rộng vào chỗ trống)  │
├───────────────────────────┤
│ Gửi ghi chú cho khoa:     │
│ [_______________] [Gửi]   │  → PatientNote (chờ duyệt)
└───────────────────────────┘
```

## B. Login công khai (DESKTOP) — `/`
```
┌──────────────────────────────────────────────┐
│  SUẤT ĂN BỆNH VIỆN            [Đăng nhập]     │
│  (giới thiệu ngắn + mã QR khoa để bệnh nhân)  │
│  ┌────────────┐   ┌───────────────────────┐   │
│  │ Bữa gần    │   │ Email  [_________]    │   │
│  │ nhất + ảnh │   │ Mật khẩu [________]   │   │
│  └────────────┘   │ [Đăng nhập]           │   │
│                   └───────────────────────┘   │
└──────────────────────────────────────────────┘
   → sau login: điều hướng theo role tới màn "việc tiếp theo"
```

## C. NURSE — Báo suất hôm nay (DESKTOP)
```
┌────────────────────────────────────────────────────────────┐
│ Khoa Nội · Hôm nay 18/08     [Lịch] [Ghi chú chờ duyệt (2)] │
├────────────────────────────────────────────────────────────┤
│ Bữa trưa · chốt 09:00 (còn 40')                            │
│  Mã chế độ        Số suất   Ghi chú                         │
│  Cơm thường       [ 23 ]    [__________]                    │
│  Đái tháo đường   [  8 ]    [__________]                    │
│  Cháo             [  4 ]    [__________]                    │
│                              [Lưu báo suất]                 │
│  (sau chốt: dòng khóa + [+ Báo bổ sung])                   │
└────────────────────────────────────────────────────────────┘
```
### NURSE mobile (rút gọn, nếu cần dùng máy):
```
┌───────────────┐
│ Nội · Trưa    │
│ Cơm thường 23 │
│ ĐTĐ         8 │
│ Cháo        4 │
│ [Lưu]         │
└───────────────┘
```

## D. DIETITIAN — Lên thực đơn (DESKTOP) (§VII, §IX)
```
┌──────────────────────────────────────────────────────────────┐
│ Thực đơn: Trưa 19/08 · ‹ĐTĐ› · ‹Ăn thường›   [Lấy mẫu][Copy]  │
├───────────────────────────┬──────────────────────────────────┤
│ MÓN / THỰC PHẨM   gram %TB │ ĐÁNH GIÁ CHỈ TIÊU                │
│ • Cơm gạo tẻ   150   3     │  Năng lượng  ‹Đạt›               │
│ • Cá kho        80   0     │  Protein     ‹Đạt›               │
│ • Rau luộc     100   8     │  Natri       ‹Vượt›  ▸           │
│ [+ Thêm thực phẩm]         │  Chất xơ     ‹Thiếu› ▸           │
│                            │  Tổng quan:  ‹Có cảnh báo›       │
├───────────────────────────┴──────────────────────────────────┤
│ [Lưu nháp]  [Lưu làm mẫu]  [Duyệt & chuyển sang báo ăn]       │
└──────────────────────────────────────────────────────────────┘
```
(Progressive disclosure: chỉ tiêu ‹Vượt›/‹Thiếu› bấm ▸ mới hiện actual vs target.)

## E. KITCHEN — Bữa tiếp theo (DESKTOP) (§XII)
```
┌──────────────────────────────────────────────────────────────┐
│ ► BỮA TRƯA · 11:00 · còn 40'                     82 suất      │
├──────────────────────────────────────────────────────────────┤
│ Theo mã chế độ:  Cơm thường 50 · ĐTĐ 20 · Cháo 12            │
│ ⚠ Suất bổ sung: +1 ĐTĐ (Khoa Nội, "mới nhập")  [Nhận][Không đủ]│
├───────────────────────────┬──────────────────────────────────┤
│ THỰC ĐƠN (snapshot)       │ ĐI CHỢ / XUẤT DỰ KIẾN            │
│ Cơm thường: Cơm, Cá kho…  │  Gạo 12.5kg · Cá 6.0kg · Muối —  │
├───────────────────────────┴──────────────────────────────────┤
│ Trạng thái: [Nhận suất]→[Chuẩn bị]→[Thực xuất kho]→[Phục vụ]  │
│ Bằng chứng: [+Ảnh bữa] [+Ảnh lưu mẫu] [+Ảnh nhập kho] [+Bill] │
└──────────────────────────────────────────────────────────────┘
```

## F. Lịch tuần (DESKTOP, mọi role) (§IV)
```
┌───────────────────────────────────────────────────────────┐
│ ‹◄ Tuần 18–24/08 ►›   Lọc: [Ăn thường ▾]   (Admin: mọi tuần)│
├──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────────┤
│      │ T2   │ T3   │ T4   │ T5   │ T6   │ T7   │ CN       │
│ Sáng │✅82  │…                                            │
│ Trưa │►40'  │ ‹chưa có thực đơn› …                        │
│ Chiều│ …                                                  │
└──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────────┘
Ô: trạng thái + số suất + cờ (⚠ bổ sung / ‹chưa có thực đơn› / ✅ phục vụ)
```

## G. ADMIN — Hôm nay (DESKTOP) (§XV)
```
┌──────────────────────────────────────────────────────────┐
│ HÔM NAY 18/08   [Lịch][Nhân sự][Mã chế độ][Kho][Báo cáo][Cài đặt]│
├──────────────────────────────────────────────────────────┤
│ Cảnh báo:  ‹2 chế độ chưa có thực đơn›  ‹1 suất bổ sung chờ›│
│ Bữa: Sáng ✅ · Trưa ► · Chiều ‹dự kiến›                    │
│ Khoa: Nội ✅ · Ngoại ‹chưa báo suất›                       │
└──────────────────────────────────────────────────────────┘
```

## H. ADMIN — Báo cáo (DESKTOP) (§XVI) — MỘT trình, không nhiều nút
```
┌──────────────────────────────────────────────┐
│ Từ [18/08] Đến [24/08]                        │
│ Nội dung: ☑ Suất ăn ☑ Suất bổ sung ☐ Thực đơn │
│           ☐ Tổng hợp thực phẩm ☐ Nhập kho     │
│           ☐ Xuất kho ☐ Chênh lệch DK/TX ☐ Bill│
│ Xuất: (•)Excel ( )PDF ( )In        [Xuất]     │
└──────────────────────────────────────────────┘
```
