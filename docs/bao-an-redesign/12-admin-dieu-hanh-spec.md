# 12 — ADMIN "ĐIỀU HÀNH": spec giao diện đã được duyệt

> Chỉ dẫn cho agent triển khai (Codex). Đọc kèm `AGENTS.md`, `10-ui-ux-guidelines.md`, `05-information-architecture.md`.
> **Chủ dự án đã duyệt bố cục này ("như này là đẹp") — bám sát, không tự chế bố cục khác.**
> **CẬP NHẬT 23/08 sau khi chủ dự án xem bản trên VPS — đọc kỹ §1b, §1c.**
> Màn này chủ yếu để **xem/giám sát** (dinh dưỡng & bếp là người nhập chính), **nhưng admin ĐƯỢC bổ sung/chỉnh dữ liệu còn thiếu** — xem §1c.

---

## 1. Khung trang

```
┌─ HEADER (xanh rêu #123c36) ─────────────────────────────────────────────┐
│ ◉ Dinh dưỡng 2598   [Điều hành] Lịch tuần  Kho  Báo cáo  Quản trị   🔔 (AD) admin ▾ │
└─────────────────────────────────────────────────────────────────────────┘
┌─ ① THANH TIẾN TRÌNH VÒNG ĐỜI BỮA (xem §1b) — chiếm hết bề ngang ────────┐
│  ✔ Báo suất ──── ● Bếp chuẩn bị ──── ○ Phục vụ ──── ↻ (sang bữa kế)      │
└─────────────────────────────────────────────────────────────────────────┘
┌─ ② CÁC THẺ CHỈ SỐ — ĐẶT XUỐNG DƯỚI thanh tiến trình ────────────────────┐
│ 👥 Tổng 286 suất │ ✓ 8/10 khoa đã báo │ ⚠ 2 thực đơn chưa duyệt │ 🔥 3 phát sinh chờ bếp │
└─────────────────────────────────────────────────────────────────────────┘
┌─ TRÁI ~60% ───────────────────────────┐ ┌─ PHẢI ~40%: CHI TIẾT KHOA ĐANG CHỌN ─┐
│ [Bữa sáng][Bữa trưa][Bữa chiều]       │ │ Hồi sức                  [Đã duyệt]  │
│ Bảng: Khoa │Đã báo│Tổng suất│Phát sinh│ │ Người báo / Thời gian báo             │
│        │Trạng thái│ ›                  │ │ ── Cơ cấu suất ăn (bảng %)            │
│ … các khoa …                           │ │ ── Thực đơn đã duyệt  [Xem chi tiết] │
│ Tổng cộng      286        4            │ │ ── Tiến độ bếp (stepper + giờ)       │
└───────────────────────────────────────┘ │ ── Phát sinh liên quan (n)            │
                                          │    [Xem tất cả phát sinh ›]           │
                                          └───────────────────────────────────────┘
```

**Điều hướng: THANH NGANG TRÊN HEADER** (không dùng sidebar cho màn này): `Điều hành` (đang mở) · `Lịch tuần` · `Kho` · `Báo cáo` · `Quản trị`. Bên phải: chuông thông báo + avatar chữ cái + tên + menu tài khoản (Hồ sơ / Đổi mật khẩu / Đăng xuất).

**Chọn bữa bằng TAB** (`Bữa sáng / Bữa trưa / Bữa chiều` — sinh động từ `MealType` ACTIVE theo `sortOrder`, **hỗ trợ 4–5 bữa**, không hardcode 3). Mặc định mở **bữa đang diễn ra theo giờ hiện tại (giờ VN)**.

**Master–detail:** bấm một dòng khoa ở bảng trái → panel phải đổi theo khoa đó. Dòng đang chọn có **viền trái xanh + nền xanh nhạt**. Không điều hướng sang trang khác.

---

## 1b. THANH TIẾN TRÌNH VÒNG ĐỜI BỮA (thay cho thẻ "Bữa đang chọn")

Thẻ *"Bữa đang chọn · Trưa 11:30"* hiện nay **không phản ánh được việc đang chạy tới đâu** → **bỏ**, thay bằng **một thanh tiến trình nằm trên cùng, chiếm hết bề ngang**, thể hiện đúng vòng đời một bữa:

```
   ✔ Báo suất  ────────  ● Bếp chuẩn bị  ────────  ○ Phục vụ  ────────  ↻ Bữa kế
   (điều dưỡng chốt)      (bếp nấu)                (phát suất)          (xoay vòng)
```

- **Đây là VÒNG LẶP**: hết bữa này thì tự chuyển sang bữa kế (Sáng → Trưa → Chiều → Sáng hôm sau…). Thanh phải cho thấy **đang ở chặng nào của bữa nào**, và **chặng kế tiếp là gì, lúc mấy giờ**.
- Chặng xác định theo **giờ thực** (giờ VN), mốc lấy từ `MealType.cutoffTime` / `serviceTime` — **dùng đúng logic ở tài liệu 16**, KHÔNG viết logic thời gian thứ hai.

| Chặng | Khi nào | Nhãn hiển thị |
|---|---|---|
| **Báo suất** | `now < cutoff` | *Đang nhận báo suất* — kèm "còn … phút tới giờ chốt" |
| **Bếp chuẩn bị** | `cutoff ≤ now < service` | *Bếp đang chuẩn bị* |
| **Phục vụ** | `service ≤ now < service+60′` | *Đang phục vụ* |
| **Kết thúc** | sau đó | **"Kết thúc"** (xem §1c) → thanh chuyển sang **bữa kế** |

- Chặng **đã qua**: dấu ✔ + mờ. Chặng **đang chạy**: nổi bật + có giờ/đếm ngược. Chặng **chưa tới**: xám.
- Tự cập nhật khi qua mốc giờ (~30–60 giây), không cần tải lại trang.
### Tabs bữa phải BÁM THEO THỜI ĐIỂM HIỆN TẠI

Tabs bữa (sinh động từ `MealType`, **không cố định 3 bữa** — xem tài liệu 19) vẫn giữ để xem lại bữa khác, **nhưng:**

1. **Mặc định mở đúng bữa đang diễn ra theo giờ thực** — không bắt người dùng tự chọn, không mặc định "bữa đầu tiên trong ngày". Bữa đang diễn ra = bữa mà thanh tiến trình (§1b) đang chỉ.
2. **Tab đó phải được đánh dấu "đang diễn ra"** (chấm/nhãn + nổi bật) để phân biệt với các tab khác. Bữa **đã qua** ghi **"Kết thúc"**; bữa **chưa tới** để xám.
3. **Tự chuyển khi qua mốc giờ**: đang mở màn mà qua giờ chuyển bữa thì tab đang chọn tự nhảy sang bữa kế (cùng nhịp cập nhật ~30–60 giây với thanh tiến trình) — **trừ khi người dùng đã tự bấm sang bữa khác** thì tôn trọng lựa chọn của họ.
4. Khi người dùng đã tự chọn bữa khác → hiện nút **"Về hiện tại"** để quay lại bữa đang diễn ra.
5. Mỗi tab hiển thị kèm **giờ ăn** của bữa đó (lấy `serviceTime`), để nhìn là biết mốc.

> Quy tắc này áp dụng cho **mọi màn có chọn bữa** (`/quan-ly`, `/bep`, `/bao-suat`, `/thuc-don`) — dùng chung một hàm xác định "bữa hiện tại" theo tài liệu 16, **không viết logic giờ thứ hai**.

## 1c. TỪ NGỮ, MÀU CẢNH BÁO, VÀ QUYỀN SỬA CỦA ADMIN

### Từ ngữ cho việc đã qua
Sự kiện/chặng **đã qua** dùng đúng từ **"Kết thúc"** (không dùng "Đã phục vụ xong", "Hoàn tất", "Đã qua"… mỗi chỗ một kiểu). Áp dụng thống nhất cho thanh tiến trình, badge trạng thái và stepper bếp.

### Màu & dấu cảnh báo (thống nhất toàn màn)
| Dấu hiệu | Nghĩa |
|---|---|
| **⚠ chấm than (hổ phách)** | **Thiếu dữ liệu** — hệ thống chưa có mốc/thông tin đó (vd bếp chưa bấm trạng thái nên không có giờ) |
| **🔴 đỏ** | **Điều dưỡng CHƯA BÁO SUẤT** — dành riêng cho trường hợp này, không dùng đỏ cho việc khác |
| `—` | ô không có dữ liệu (không phải số 0) |

### Admin được bổ sung dữ liệu thiếu
Chỗ nào đang `—` / ⚠ vì thiếu mốc (ví dụ **Tiến độ bếp**: "Đã nhận —", "Chờ xuất —"), **admin được sửa/bổ sung sau**:
- Bấm vào mốc thiếu → **Dialog** nhập bổ sung (giờ, ghi chú **lý do bắt buộc**).
- **Bắt buộc ghi `AuditLog`** cùng transaction: ai sửa, lúc nào, trước/sau, lý do — đánh dấu rõ đây là **bổ sung thủ công của admin**, không phải bếp tự bấm.
- Trên giao diện, mốc do admin bổ sung phải **hiện nhãn phân biệt** (vd "bổ sung thủ công") để không lẫn với dữ liệu bếp ghi thật.
- **KHÔNG** cho admin sửa **số suất gốc đã chốt** và **snapshot thực đơn đã duyệt** (hai thứ này vẫn bất biến theo luật cũ). Chỉ bổ sung **mốc thời gian/ghi chú còn trống**.
- Ô đỏ "điều dưỡng chưa báo" → admin **không tự báo thay**; chỉ hiện cảnh báo và lối tắt nhắc khoa đó.

## 2. Ánh xạ dữ liệu (BẮT BUỘC — không được bịa số)

| Chỗ trên UI | Lấy từ đâu |
|---|---|
| `Bữa trưa · 11:00` | `MealType.name` + `MealType.serviceTime` của bữa đang chọn |
| `Tổng 286 suất` | Σ `DietMeal.servingsPlanned` của `MealEvent` bữa đó (hôm nay) |
| `8/10 khoa đã báo` | số `Department` có `ServingReport` (status SUBMITTED) cho bữa đó / tổng `Department` ACTIVE |
| `2 thực đơn chưa duyệt` | đếm `DietMeal` của bữa đó có `approvedAt = null` |
| `3 phát sinh chờ bếp` | đếm `LateMealAddition` có `ackStatus = PENDING` |
| Cột **Khoa** | `Department.name` |
| Cột **Đã báo** | có `ServingReport` → ✓ xanh; chưa có → ⚠ hổ phách |
| Cột **Tổng suất** | Σ `ServingReportLine.quantity` của khoa đó, bữa đó |
| Cột **Phát sinh** | đếm `LateMealAddition` của khoa+bữa đó (0 thì hiện `0` xám, >0 hiện số cam) |
| Cột **Trạng thái** | badge: `Đã duyệt` (xanh) khi thực đơn của bữa đã duyệt · `Chưa báo` (hổ phách) khi khoa chưa gửi báo suất |
| Dòng **Tổng cộng** | cộng cột Tổng suất + cột Phát sinh |
| Panel: **Người báo** | `ServingReport.submittedBy.displayName` |
| Panel: **Thời gian báo** | `ServingReport.submittedAt` (giờ · ngày) |
| Panel: **Cơ cấu suất ăn** | nhóm `ServingReportLine` theo `DietType.name` → cột `Suất` = quantity, cột `Tỷ lệ` = quantity/tổng ×100, dòng cuối `Tổng cộng … 100%` |
| Panel: **Thực đơn đã duyệt** | tên các món từ `menuSnapshotJson` (ghép bằng dấu phẩy). Nút `Xem chi tiết` → **Dialog** hiện món + định lượng + đánh giá (`evaluationJson`) |
| Panel: **Tiến độ bếp** (stepper) | trạng thái từ `DietMeal.status`; **giờ mỗi mốc lấy từ `AuditLog` action `KITCHEN_STATUS_CHANGE`** (thời điểm chuyển sang trạng thái đó) |
| Panel: **Phát sinh liên quan** | `LateMealAddition`: nội dung = `reason`, người + giờ + ngày = `submittedBy.displayName` + `submittedAt`, badge = `ackStatus` (`Chờ bếp xác nhận` khi PENDING) |

**Chưa có dữ liệu → hiển thị `—`.** Tuyệt đối không đoán số, không hiện `0` giả (khác với `0` thật của cột Phát sinh).

### ⚠️ Lưu ý bắt buộc về dữ liệu bệnh nhân
Ảnh mẫu có ghi *"(BN 1023)"*. **KHÔNG được thêm trường mã/tên bệnh nhân vào UI hay DB** — hiến chương cấm PII bệnh nhân trong module này. Nội dung phát sinh **chỉ hiển thị đúng chuỗi `reason`** do điều dưỡng tự nhập, không thêm field mới.

---

## 3. Chi tiết thành phần

- **Stepper tiến độ bếp**: các mốc theo đúng state machine hiện có — `Đã nhận` → `Đang chuẩn bị` → `Đang nấu` → `Chờ xuất` (ánh xạ `LOCKED/PREPARING/PREPARED/SERVED`). Mốc đã qua: dấu ✓ xanh đậm + giờ; mốc đang chạy: nổi bật; mốc chưa tới: xám nhạt. Không có giờ → `—`.
- **Badge màu**: xanh = đạt/đã duyệt/đã báo · hổ phách = cần chú ý (chưa báo, chờ xác nhận) · xám = chưa tới.
- **Dòng cảnh báo**: khoa chưa báo → cả dòng nền hổ phách nhạt (như `Da liễu` trong ảnh).
- **Mật độ cao**: dòng bảng thấp, chữ ~13px, số canh phải + `tabular-nums`, ít khoảng trắng — đồng bộ `/quan-ly`, `/quan-tri`, `/bao-suat`.
- **Chuông thông báo**: nếu chưa có nguồn dữ liệu thông báo thì để icon tĩnh + `—`, KHÔNG bịa danh sách.

---

## 4. Ràng buộc

- Mặc định là **màn giám sát (đọc)**; phần đọc mở rộng trong `src/lib/management.ts`.
- **Ngoại lệ duy nhất được ghi dữ liệu:** chức năng **admin bổ sung mốc/ghi chú còn thiếu** ở §1c — phải là server action **mới, tách riêng**, có kiểm quyền `ADMIN`, **lý do bắt buộc**, và **AuditLog cùng transaction**. Ngoài phạm vi đó, **không thêm mutation nào khác** trên màn này.
- **KHÔNG** đổi `schema.prisma` / migration / `packages/nutrition-engine` / các server action đang có.
- **KHÔNG** lộ `internalNote` (chỉ được dùng `patientVisibleNote` nếu cần hiện ghi chú).
- Chỉ đụng khu admin (`/quan-ly` hoặc route "điều hành" mới) + `management.ts` + css của nó. **KHÔNG** đụng `/bao-suat`, `/bep`, `/thuc-don`, `/kho`, `/bao-cao`, `/ho-so`, `/k`.
- Nếu đổi sang **thanh điều hướng ngang** thì chỉ áp cho khu admin; **giữ nguyên** điều hướng của DIETITIAN / NURSE / KITCHEN.
- A11y: bảng semantic (`<th scope>`), dòng chọn được bằng bàn phím + `aria-current`, focus ring rõ, tab list đúng ARIA, icon-only button có `aria-label`.

## 5. Nghiệm thu

- `npm run build` + `typecheck` + `lint` sạch; `npm test` xanh.
- Đủ 5 thẻ chỉ số, tab bữa động, bảng khoa + dòng tổng, panel chi tiết đổi theo khoa được chọn, stepper có giờ, phát sinh có badge.
- Số liệu khớp DB (đối chiếu bằng dữ liệu demo `DEMO_SEED=1`), chỗ thiếu hiện `—`.
