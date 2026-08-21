# 04 — Permission Matrix

4 role: **ADMIN** (Admin/Trưởng khoa) · **DIETITIAN** (NVDD) · **NURSE** (Điều dưỡng) · **KITCHEN** (Bếp).
Ký hiệu: ✅ được · ⛔ không · **(khoa)** = chỉ trong khoa mình (theo `DepartmentMembership`) · — = không liên quan.

| Nghiệp vụ | Hành động | ADMIN | DIETITIAN | NURSE | KITCHEN |
|---|---|:--:|:--:|:--:|:--:|
| **Thực đơn (DietMeal menu)** | Xem | ✅ | ✅ | ✅ (xem) | ✅ |
| | Tạo/Sửa/Copy mẫu | ✅ | ✅ | ⛔ | ⛔ |
| | Duyệt & chuyển sang báo ăn (snapshot) | ✅ | ✅ | ⛔ | ⛔ |
| **Số suất (ServingReport)** | Xem | ✅ | ✅ | ✅ (khoa) | ✅ (tổng theo chế độ) |
| | Báo/Sửa trước chốt | ✅ | ⛔ | ✅ (khoa) | ⛔ |
| **Suất bổ sung (LateMealAddition)** | Tạo (sau chốt) | ✅ | ⛔ | ✅ (khoa) | ⛔ |
| | Xử lý ack (nhận/không đủ/thay thế) | ✅ | ⛔ | ⛔ | ✅ |
| **Trạng thái bữa (DietMeal.status)** | PREPARING→PREPARED→SERVED | ✅ | ⛔ | ⛔ | ✅ |
| **Bằng chứng (MealEvidence)** | Upload ảnh bữa/mẫu | ✅ | ✅ | ⛔ | ✅ |
| | Xem | ✅ | ✅ | ✅ | ✅ |
| **Ghi chú bệnh nhân (PatientNote)** | Duyệt/Từ chối | ✅ | ⛔ | ✅ (khoa) | ⛔ |
| | Xem (đã duyệt) | ✅ | ✅ | ✅ (khoa) | ✅ |
| **Kho (Warehouse/Inventory)** | Nhập kho + chứng từ | ✅ | ✅ | ⛔ | ✅ |
| | Thực xuất (OUT) | ✅ | ✅ | ⛔ | ✅ |
| | Điều chỉnh (ADJUST) | ✅ | ✅* | ⛔ | ✅* |
| | Hủy/Vô hiệu giao dịch | ✅ | ⛔ | ⛔ | ⛔ |
| **Báo cáo** | Xuất (Excel/PDF/in) | ✅ | ✅ | ✅ (khoa) | ✅ (kho/bếp) |
| **Mã chế độ / quy định (DietType, rule)** | Cấu hình | ✅ | ✅** | ⛔ | ⛔ |
| **Nhân sự & tài khoản** | Quản lý user/khoa/membership | ✅ | ⛔ | ⛔ | ⛔ |
| **Cài đặt hệ thống (AppSetting)** | Sửa giờ chốt/số ngày/sonde/kho | ✅ | ⛔ | ⛔ | ⛔ |
| **Audit log** | Xem | ✅ | ⛔ | ⛔ | ⛔ |

\* Điều chỉnh kho: cho phép, nhưng "Hủy/Vô hiệu" chỉ ADMIN (theo §XVIII).
\** NVDD được đề xuất/sửa nội dung dinh dưỡng của mã chế độ; ADMIN chốt quy định hệ thống. (Có thể siết về chỉ ADMIN nếu muốn — hỏi khi review.)

## Quy tắc chung
- **Scope khoa**: NURSE chỉ thấy/thao tác khoa mình (auto theo membership, **không có ô chọn khoa**). ADMIN/DIETITIAN/KITCHEN thấy toàn viện.
- **KITCHEN thấy số suất GỘP theo mã chế độ** (toàn viện), không cần chi tiết từng khoa để nấu; nhưng báo cáo vẫn tách được theo khoa.
- **Bệnh nhân**: không phải role đăng nhập — truy cập công khai qua QR khoa, chỉ **xem** + **gửi ghi chú** (vào hàng chờ duyệt).
- **Không hard-delete**: mọi "xóa" nghiệp vụ = Hủy/Vô hiệu + lý do + audit.
- Bác sĩ/`CLINICIAN`: **không có trong giai đoạn này** (HIS/EMR sau).
