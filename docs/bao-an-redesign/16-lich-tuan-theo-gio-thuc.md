# 16 — LÀM LẠI LỊCH TUẦN: trạng thái theo GIỜ THỰC + bấm ô xem chi tiết

> Chỉ dẫn cho agent triển khai (Codex). Đọc kèm `AGENTS.md`, `15-thong-nhat-giao-dien.md` (token/phông), `12-admin-dieu-hanh-spec.md` (đã làm logic theo giờ cho admin — **tái dùng, đừng viết lại**).
> Áp dụng cho lịch dùng chung của **Bếp · Dinh dưỡng · Điều dưỡng** (và admin).

---

## 1. Lỗi hiện tại (đã kiểm chứng trong code)

```
components/weekly-calendar.tsx:40
  const status = rollupMealEventStatus(event?.dietMeals.map((meal) => meal.status) ?? []);

lib/meal-events.ts
  export function rollupMealEventStatus(statuses: DietMealStatus[]) { … }   // KHÔNG có tham số thời gian
```
`app/(app)/lich/page.tsx` **không đọc `MealType.cutoffTime` / `serviceTime`**, không truyền giờ hiện tại xuống.

→ Badge chỉ phản ánh **trạng thái lưu trong DB**, bất chấp giờ thực. Ảnh chụp trên VPS lúc **23/08 05:29**:
- **T2 17/08** (6 ngày TRƯỚC) vẫn hiện **"Đang chuẩn bị"** — vô lý.
- **Chiều CN 23/08** (17:00, còn ~12 tiếng nữa) cũng hiện **"Đang chuẩn bị"** — vô lý.

**Nguyên tắc nghiệp vụ: bếp nấu theo MỘT khung giờ của bữa đó.** Qua khung giờ thì bữa đó phải xong; bữa chưa tới khung giờ thì chưa thể "đang nấu".

---

## 2. Yêu cầu: trạng thái hiển thị = f(giờ thực, trạng thái lưu)

Với mỗi ô (ngày × bữa), tính theo **giờ VN**, mốc lấy từ `MealType.cutoffTime` và `MealType.serviceTime` của chính bữa đó:

| Khoảng thời gian | Trạng thái hiển thị | Màu |
|---|---|---|
| `now < cutoff` | **Đang nhận báo suất** (khoa còn chốt số được) | xanh nhạt / trung tính |
| `cutoff ≤ now < service` | **Đang chuẩn bị** → **Đang nấu** (đây là khung bếp làm) | hổ phách nổi |
| `service ≤ now < service + 60′` | **Đang phục vụ** | xanh đậm nổi |
| `now ≥ service + 60′` **và** trạng thái lưu = `SERVED` | **Đã phục vụ** | xanh xám (đã xong) |
| `now ≥ service + 60′` **nhưng** chưa `SERVED` | **⚠ Chưa hoàn tất** | **cảnh báo** |
| Ngày trong tương lai (chưa tới cutoff) | **Chưa tới** | xám nhạt |

**Quy tắc kết hợp (quan trọng):**
- Nếu **trạng thái lưu đã tiến XA HƠN** mốc thời gian (vd bếp bấm `SERVED` sớm) → **ưu tiên trạng thái lưu**.
- Nếu **thời gian đã qua mà trạng thái lưu chưa theo kịp** → hiện **"⚠ Chưa hoàn tất"**, **KHÔNG được hiện "Dự kiến"** (đó là lỗ hổng dữ liệu, phải nhìn thấy).
- Ô không có dữ liệu → **`—`** (không phải `0`, không phải "Dự kiến").

**Tự cập nhật:** trạng thái phải đổi khi qua mốc giờ mà không cần tải lại trang thủ công (client tính lại định kỳ ~30–60 giây, như đã làm ở `/quan-ly`).

### Phân biệt quá khứ / hôm nay / tương lai
- **Cột hôm nay**: nổi bật (viền/nền đậm hơn).
- **Ngày đã qua**: làm mờ nhẹ (nhưng ô "⚠ Chưa hoàn tất" vẫn phải nổi).
- **Bữa đang diễn ra**: đánh dấu rõ nhất trên toàn bảng.

---

## 3. Áp dụng cho cả 3 vai

Cùng **một logic thời gian**, chỉ khác phạm vi dữ liệu:

| Vai | Thấy gì |
|---|---|
| **Điều dưỡng** | số suất **khoa mình**; nhấn mạnh bữa **sắp tới hạn chốt** |
| **Bếp** | tổng suất toàn viện theo mã; nhấn mạnh bữa **đang trong khung nấu** |
| **Dinh dưỡng** | mã **chưa có thực đơn duyệt**; nhấn mạnh bữa cần lên thực đơn trong cửa sổ nhập |
| **Admin** | toàn viện (đã có ở `/quan-ly`) |

Giữ nguyên quyền/scope hiện tại (điều dưỡng chỉ khoa mình; ADMIN mọi tuần, vai khác tuần này + tuần sau).

---

## 4. Bấm ô → hiện CHI TIẾT (popup)

Mỗi ô (ngày × bữa) **bấm được** → mở **Dialog** (không xổ xuống, không chuyển trang), nội dung:

- **Bữa · ngày · trạng thái theo giờ thực** (kèm mốc: chốt lúc … / ăn lúc …).
- **Từng mã chế độ**: tên + mã, số suất, trạng thái.
- **Thực đơn** của bữa (món + định lượng từ `menuSnapshotJson`) + **đánh giá** (`evaluationJson`).
- **Khoa**: khoa nào đã báo / chưa báo (điều dưỡng: khoa mình).
- **Phát sinh / báo trễ**: `LateMealAddition` + lý do + trạng thái bếp xác nhận.
- **Bếp**: đã chụp ảnh bữa / lưu mẫu chưa (`MealEvidence`).
- **Người**: lên thực đơn (`DietMeal.approvedBy`), báo suất (`ServingReport.submittedBy`), bếp (`AuditLog KITCHEN_STATUS_CHANGE` gần nhất).
- Thiếu dữ liệu → **`—`**.

**Tái dùng popup đã có ở `/quan-ly`** (tài liệu 12) — **KHÔNG dựng popup thứ hai**. Nếu cần thì tách thành một component dùng chung cho cả hai màn.

---

## 5. Sửa luôn dữ liệu demo cho khớp thời gian

`scripts/seed-demo.ts` hiện rải **cả 5 trạng thái** ngẫu nhiên khắp tuần → chính nó tạo ra cảnh "6 ngày trước vẫn đang chuẩn bị".
→ Sửa seed cho **nhất quán với thời gian**: ngày đã qua = `SERVED` (kèm bằng chứng), bữa đang trong khung = `PREPARING/PREPARED`, bữa tương lai = `PLANNED`. Chừa **một ô cố ý "chưa hoàn tất"** ở quá khứ để demo được cảnh báo.

---

## 6. Ràng buộc

- **Chỉ đổi cách HIỂN THỊ.** KHÔNG đổi `DietMealStatus`, state machine của bếp, server action, schema, `nutrition-engine`.
- Hàm mới nên là **hàm thuần** (vd `displayMealState(mealDate, cutoffTime, serviceTime, storedStatus, now)`) trong `lib/meal-events.ts` → **viết unit test** cho đủ 6 nhánh ở mục 2 (test chạy không cần DB).
- Giao diện theo **tài liệu 15** (token 2598, phông serif, thang cỡ chữ, hàng bảng 36–40px) — **không tạo file CSS mới**, không đặt tên class theo phiên bản.
- Giữ scope theo vai; không lộ `internalNote`.

## 7. Nghiệm thu

- `npm run build` + `typecheck` + `lint` sạch; `npm test` xanh + **có test cho `displayMealState`**.
- Mở `/lich` lúc bất kỳ: **không còn** ngày quá khứ hiện "Đang chuẩn bị"; **không còn** bữa tương lai hiện "Đang nấu".
- Bữa quá khứ chưa `SERVED` → hiện **⚠ Chưa hoàn tất** (không phải "Dự kiến").
- Cột hôm nay nổi bật; bữa đang diễn ra đánh dấu rõ.
- Bấm ô bất kỳ → popup hiện đủ mục ở §4; ô trống → `—`.
- Đăng nhập lần lượt **bếp / dinh dưỡng / điều dưỡng**: cùng logic thời gian, đúng phạm vi từng vai.
