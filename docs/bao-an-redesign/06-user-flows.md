# 06 — User Flows

Ký hiệu: **[actor]** → hành động; *(hệ thống)* = side-effect + audit.

## Flow 1 — NVDD lên thực đơn (§VII)
1. **[NVDD]** Màn chủ thấy "(ngày × chế độ) chưa có thực đơn duyệt" → chọn 1 mục (vd Trưa 19/08 · ĐTĐ).
2. **[NVDD]** Chọn **ăn thường / sonde** (feedingRoute) → chọn mã chế độ.
3. **[NVDD]** **Tạo mới** hoặc **Lấy mẫu / Copy** (từ `MenuTemplate` hoặc thực đơn ngày khác).
4. **[NVDD]** Chỉnh món + khối lượng (dùng lại engine tính khẩu phần: thực phẩm + gram + %thải bỏ).
5. *(hệ thống)* **engine `diet-evaluation`** so với rule mã chế độ → trả `overall` + từng chỉ tiêu (Protein đạt / Natri vượt / Chất xơ thiếu…).
6. **[NVDD]** Chưa đạt → sửa, lặp lại 4–5.
7. **[NVDD]** **Duyệt & chuyển sang báo ăn** → *(hệ thống)* đóng băng `DietMeal.menuSnapshotJson` + `evaluationJson`, set `approvedAt/By`, status `PLANNED`. Ghi `AuditLog`.
8. (Tùy chọn) **[NVDD]** **Lưu làm mẫu** → `MenuTemplate` cá nhân.
- **Nhiều ngày**: cho chọn nhiều ngày áp cùng thực đơn (copy sang từng DietMeal).

## Flow 2 — Điều dưỡng báo suất (§X)
1. **[NURSE]** Màn chủ = **Báo suất hôm nay**, khoa mình (auto, không chọn khoa).
2. **[NURSE]** Với mỗi mã chế độ → gõ số suất (Cơm thường 23, ĐTĐ 8, Cháo 4). Ghi chú nếu cần (internal / patient-visible).
3. **[NURSE]** Lưu → *(hệ thống)* upsert `ServingReport` + `ServingReportLine` (unique khoa×bữa) → **cộng lại** `DietMeal.servingsPlanned` (toàn viện theo chế độ). Ghi `AuditLog`.
4. Trước giờ chốt: sửa thoải mái (mỗi lần ghi audit).

## Flow 3 — Điều dưỡng báo bổ sung sau chốt (§XI)
1. *(hệ thống)* Qua **giờ chốt chuẩn** → DietMeal `LOCKED`. Số đã chốt **khóa** (không sửa).
2. **[NURSE]** Phát sinh (nhập viện/chuyển khoa/đổi chế độ) → **Báo bổ sung**: mã chế độ + số suất + **lý do** (bắt buộc).
3. *(hệ thống)* Tạo `LateMealAddition` (kind=SUPPLEMENT), **KHÔNG đụng số gốc**. Bếp nhận **cảnh báo**. Ghi `AuditLog`.
4. **[KITCHEN]** Xử lý: **Đã nhận / Không đủ / Cần thay thế** (ackStatus + ghi chú).
5. Nếu bữa đã **SERVED** mà vẫn phát sinh → `kind=URGENT_POST_SERVE` (không reopen lịch sử). Báo cáo giữ: chốt 20 + bổ sung 1 = 21.

## Flow 4 — Bếp xử lý bữa (§XII)
1. **[KITCHEN]** Màn chủ = **Bữa tiếp theo** (đếm ngược, tổng suất).
2. **[KITCHEN]** Mở bữa → thấy: số suất theo mã, thực đơn (snapshot), ghi chú đã duyệt, **suất bổ sung**, **xuất dự kiến** (engine `shopping`).
3. **[KITCHEN]** **Nhận suất** → status `PREPARING`.
4. **[KITCHEN]** **Thực xuất kho** → tạo `InventoryTransaction(type=OUT)` (đối chiếu dự kiến/thực xuất).
5. **[KITCHEN]** **Đã chuẩn bị** (`PREPARED`) → **Đã phục vụ** (`SERVED`).
6. **[KITCHEN]** Upload **bằng chứng**: ảnh bữa (bệnh nhân xem so sánh), ảnh lưu mẫu, ảnh nhập kho, hóa đơn → `MealEvidence`/`Document`.
- Mỗi bước ghi `AuditLog`. Ảnh = evidence, **không** đổi state.

## Flow 5 — Nhập kho (§XIII, thao tác nhanh)
1. **[KITCHEN/NVDD]** Kho → **Nhập nhanh**: chọn kho (Mode B: bếp/sonde) → thêm dòng (thực phẩm/tên tự do + số lượng + đơn vị + đơn giá).
2. (Tùy chọn) **[AI]** Đọc hóa đơn/bill → **pre-fill** dòng (chỉ hỗ trợ, sửa được, không bắt buộc).
3. **[KITCHEN/NVDD]** **Lưu ngay** → `InventoryTransaction(type=IN)` + `Document` (ảnh/bill). Chỉnh sau nếu có quyền.
4. *(hệ thống)* Ghi `AuditLog`.

## Flow 6 — Admin cấu hình (§XV)
1. **[ADMIN]** Cài đặt → đặt: số ngày NVDD/điều dưỡng nhập trước · giờ chốt/giờ ăn mặc định · **bật/tắt sonde** · **số kho (Mode A/B)** · role duyệt kho · rule.
2. **[ADMIN]** Nhân sự: tạo user/khoa, gán `DepartmentMembership` (điều dưỡng ↔ khoa).
3. **[ADMIN]** Mã chế độ/quy định: cấu hình `DietType` (+ feedingRoute, nối `DietCode`).
4. *(hệ thống)* Mọi thay đổi cấu hình ghi `AuditLog` (before/after).
- Admin **không nhập liệu thay mọi người** — chỉ đặt luật + kiểm tra + chỉnh ngoại lệ.

## Flow phụ — Bệnh nhân (§III, §X)
1. **[Bệnh nhân]** Quét QR khoa → `/k/[token]` (mobile, không đăng nhập).
2. Xem: bữa đang phục vụ + ảnh + bữa tiếp theo + **mức đáp ứng chỉ tiêu** + note cho phép.
3. (Tùy chọn) Gửi **ghi chú** ("ăn nhạt", "dị ứng tôm") → `PatientNote(status=RECEIVED)`.
4. **[NURSE]** Duyệt → `APPROVED` → **[KITCHEN]** mới thấy. (Chống spam khi công khai.)
