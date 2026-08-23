# 21 — ĐÃ GỘP LOGIC THỜI GIAN VỀ MỘT MỐI (log cho Codex)

> **Việc này ĐÃ LÀM XONG**, không phải yêu cầu mới. Đọc để biết API mới và **đừng làm lại chuyện cũ**.
> Còn một phần chưa xong ở §4 — đó mới là việc cần làm.

## 1. Trước khi gộp — vì sao phải sửa

Hệ thống có **hai bộ logic thời gian song song**:

| | Dùng ở | Vấn đề |
|---|---|---|
| `lib/meal-events.ts → displayMealState` | admin, bếp, lịch tuần | cửa sổ phục vụ **hardcode 60 phút**, bỏ qua cấu hình |
| `lib/nurse-workflow.ts → currentNurseWorkflow` | điều dưỡng | hết bữa trong ngày thì rơi về `ordered[0] + REPORTING` |

Hậu quả thấy trên VPS lúc **21:00**: admin hiện *"Chiều · ⚠ Chưa hoàn tất"*, còn điều dưỡng hiện *"Sáng — Báo suất ăn"* — tức bảo điều dưỡng đi báo suất cho bữa đã phục vụ xong ~14 tiếng trước. **Hai màn, hai câu trả lời cho cùng một câu hỏi "bây giờ đang ở đâu".**

## 2. Sau khi gộp — API dùng chung

Tất cả nằm trong **`src/lib/meal-events.ts`** — **NGUỒN SỰ THẬT DUY NHẤT về thời gian**:

```ts
// Thuần thời gian, không xét trạng thái lưu. Trả null nếu giờ sai định dạng.
mealTimePhase(mealDate, cutoffTime, serviceTime, now?, completionMinutes?)
  : "BEFORE_CUTOFF" | "PREPARING" | "SERVING" | "PASSED" | null

MEAL_PHASE_LABEL   // nhãn tiếng Việt dùng chung cho 4 mốc trên
DEFAULT_SERVICE_COMPLETION_MINUTES = 60

// Mốc giờ + phủ trạng thái lưu (SERVED, PREPARED…) lên trên → nhãn/tone để hiển thị
displayMealState(mealDate, cutoffTime, serviceTime, storedStatus, now?, completionMinutes?)

// Chọn bữa cho thanh vòng đời: đang chạy → sắp tới → hết bữa thì cuốn sang vòng kế
pickLifecycleMeal(meals, now?, completionMinutes?) : { meal, nextCycle } | null
```

**`lib/nurse-workflow.ts` đã bị XÓA** (cùng `currentNurseWorkflow`, `NURSE_PHASE_LABEL`, `test/nurse-workflow.test.ts`).
Các ca kiểm thử của nó được chuyển sang **`test/meal-time-phase.test.ts`**, cộng thêm ca cho `completionMinutes` và giờ sai định dạng.

### ⚠️ LUẬT
**Không được viết bộ logic thời gian thứ hai.** Mọi màn cần biết "bữa nào, đang chặng nào" đều gọi hàm trên. Nếu thiếu gì thì **mở rộng `meal-events.ts`**, không tạo module song song.

## 3. Vòng đời là VÒNG LẶP, không có điểm dừng

Phục vụ chạy liên tục nên thanh tiến trình chỉ có **3 chặng**: `Báo suất → Bếp chuẩn bị → Phục vụ`, hết bữa thì **cuốn sang bữa kế**.
- **KHÔNG** thêm chặng "Kết thúc" — *"Kết thúc"* chỉ là **nhãn cho bữa đã qua**, không phải một chặng.
- Bữa đã qua (`SERVED` hoặc `INCOMPLETE`) → **cả 3 chặng đều `done`, không chặng nào `active`**.
  *(Lỗi cũ: `SERVED`/`INCOMPLETE` bị gom chung nhánh với `SERVING` nên "Phục vụ" cứ sáng như đang chạy.)*
- Hết bữa trong ngày → hiện **"Các bữa hôm nay đã kết thúc · bữa kế"** + bữa đầu của vòng sau.

## 4. 🔧 CÒN LẠI — VIỆC CẦN LÀM

`serviceCompletionMinutes` là **cấu hình được** (`lib/settings.ts`, mặc định 60, cho chỉnh 15–240) nhưng **mới có trang điều dưỡng truyền vào**. Các nơi sau vẫn đang ăn mặc định 60 → **đổi cấu hình không có tác dụng**:

- `app/(app)/bep/workspace-data.ts:58` — `displayMealState(...)` thiếu tham số
- `components/weekly-calendar.tsx:50` — thiếu tham số
- `components/meal-lifecycle-strip.tsx` — thiếu tham số (cần truyền từ `ManagementDay`)
- `lib/management.ts` — nên trả thêm `serviceCompletionMinutes` để `/quan-ly` truyền xuống

**Việc cần làm:** đọc `readOperationalSettings().serviceCompletionMinutes` ở tầng server rồi truyền xuống các chỗ trên. Nghiệm thu: đổi cấu hình sang **15 phút** thì cửa sổ "Đang phục vụ" ở **lịch, bếp, admin** phải ngắn lại theo, không chỉ ở màn điều dưỡng.

## 5. Ghi chú về hành vi đã đổi (cố ý)

Ở `/bao-suat`, khi **mọi bữa trong ngày đã qua**:

| | Trước | Nay |
|---|---|---|
| `canEdit` (sửa số gốc) | `true` | **`false`** — quá giờ chốt, server vốn đã chặn |
| `canAddLate` (báo bổ sung) | `false` | **`true`** — đúng luồng `URGENT_POST_SERVE` của M5 |

Hai cờ này chỉ là **giao diện**; `upsertServingReport` vẫn tự kiểm giờ chốt độc lập, không đụng tới.

---
**Kiểm chứng khi gộp:** typecheck · lint · build sạch; test **51/51**; đối chiếu HTML render thật của `/quan-ly`, `/bao-suat`, `/bep`, `/lich` lúc 21:00 — cả bốn màn cùng một mốc giờ, không màn nào còn báo chặng đang chạy cho bữa đã qua.
