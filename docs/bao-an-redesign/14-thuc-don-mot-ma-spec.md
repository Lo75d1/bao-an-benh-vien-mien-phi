# 14 — NVDD "THỰC ĐƠN · MỘT MÃ": spec bàn nhập khẩu phần (đã duyệt)

> Chỉ dẫn cho agent triển khai (Codex). Đọc kèm `AGENTS.md`, `11-port-ui-tinh-khau-phan.md`, `13-thuc-don-nhieu-ma-spec.md`.
> **Chủ dự án đã duyệt bố cục này.** Đây là bản chi tiết của chế độ **Một mã**; chế độ **Nhiều mã** xem tài liệu 13. Cả hai dùng chung dữ liệu và cùng phải nhập được.

---

## 1. Khung trang

```
┌ HEADER: ◉ Suất ăn bệnh viện  [Thực đơn] Lịch tuần  Kho  Báo cáo            (◯) Dinh dưỡng ▾ ┐
├ 📅 23/08/2026 · 🍴 Bữa trưa · Ăn đường miệng · CƠM_THƯỜNG · «Chưa duyệt»                     ┤
├ [Lập thực đơn] [Thông tin khuyến nghị ✓] [📁 Thực đơn đã lưu] [+ Món/Đồ ăn nhanh] [+ Thực phẩm mới]   ①·Nhập thực đơn ── ②·Phân tích & báo cáo ┤
├──── CÂY MÓN (~30%) ────┬──────────────── BẢNG THÀNH PHẦN MÓN ĐANG CHỌN (~70%) ───────────────┤
│ Bữa trưa · 81 suất     │ Bữa trưa › Cá thu kho   642 kcal·Đạm 28,4g·Béo 18,6g·Bột đường 87,2g │
│   ↑ ↓  + Thêm món ⧉ 🗑 │                                    Đạt 5 · Thiếu 1 · Vượt 0          │
│ 🍚 Cơm          427 ⋮  │ [ Cá thu kho ]                            Σ món [ 106 ] g           │
│ 🐟 Cá thu kho   162 ⋮  │ Thực phẩm │Sống sạch(g)│Mua/kho(g)│Thải bỏ│ Ghi chú        │ ✕       │
│ 🥣 Canh bí đỏ    54 ⋮  │ Cá thu tươi   80    89    10%   Từ công thức: Cá thu kho   ✕        │
│ 🥬 Rau cải luộc  11 ⋮  │ Nước mắm      12    12     0%   Gia vị                     ✕        │
│ 🍳 Trứng chiên  138 ⋮  │ Hành tím      10    12    15%   Bóc vỏ, rửa                ✕        │
│ 🍉 Dưa hấu        0 ⋮  │ …                                                                    │
├────────────────────────┴──────────────────────────────────────────────────────────────────────┤
│ Đang thêm vào: Bữa trưa › Cá thu kho                                                          │
│ [Bộ lọc][Thực phẩm][Món ăn] [🔍 VD: cá chép, sữa chua; gõ không dấu được] [✏Nhập tay][✨AI Dán mô tả/ảnh] [Sang phân tích ›] │
│                                          Kết quả duyệt sẽ chuyển đến Báo suất · Bếp · Kho     │
└───────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Thành phần

### 2.1 Cây món (trái)
- Tiêu đề: `<Bữa> · <n> suất`; công cụ: `↑ ↓` đổi thứ tự · `+ Thêm món` · nhân bản (⧉) · xóa (🗑).
- Mỗi món: icon nhóm + tên + **kcal của món** + menu `⋮` (đổi tên, nhân bản, xóa).
- Món đang chọn: viền + nền xanh nhạt.

### 2.2 Bảng thành phần (phải)
- Breadcrumb `Bữa › Món`; dải tổng: **kcal · Đạm · Béo · Bột đường** + bộ đếm **`Đạt n · Thiếu n · Vượt n`** (xanh / hổ phách / đỏ).
- Ô sửa **tên món** + **`Σ món … g`** (tổng gram sống sạch của món).
- Cột bảng — **đúng 5 cột + nút xóa**:

| Cột | Ý nghĩa | Sửa được? |
|---|---|---|
| **Thực phẩm** | tên + dòng phụ `Tỷ lệ thải bỏ: n%` | không (chọn từ tìm kiếm) |
| **Sống sạch (g)** | định lượng ăn được | ✅ ô số |
| **Mua / kho (g)** | **= Sống sạch ÷ (1 − %thải bỏ)** | ❌ tự tính |
| **Thải bỏ** | `Food.wastePercent` | ❌ |
| **Ghi chú** | ghi chú theo dòng (vd "Gia vị", "Bóc vỏ, băm") | ✅ ô chữ |
| ✕ | xóa dòng | — |

### 2.3 Thanh lệnh dưới
`Đang thêm vào: <Bữa> › <Món>` · `Bộ lọc` · `Thực phẩm` · `Món ăn` · ô tìm (**gõ không dấu được**) · `Nhập tay` · `AI (Dán mô tả / ảnh)` · **`Sang phân tích ›`** + dòng phụ *"Kết quả duyệt sẽ chuyển đến Báo suất · Bếp · Kho"*.

---

## 3. Ánh xạ dữ liệu

| UI | Nguồn |
|---|---|
| Ngày · Bữa · Đường nuôi · MÃ | `MealEvent.mealDate` · `MealType.name` · `feedingRoute` · `DietType.code` |
| Badge `Chưa duyệt` / `Đã duyệt` | `DietMeal.approvedAt` |
| `81 suất` | `DietMeal.servingsPlanned` |
| kcal mỗi món / tổng bữa | engine `calculateMenuTotals` (nhóm theo `dishName`) |
| Đạm / Béo / Bột đường | engine (tổng theo item) |
| `Đạt n · Thiếu n · Vượt n` | engine `evaluateDiet` với ngưỡng `DietType.dietCodeRef` (đếm OK / LOW / HIGH) |
| `Tỷ lệ thải bỏ` + cột `Thải bỏ` | `Food.wastePercent` |
| `Mua / kho (g)` | `Sống sạch ÷ (1 − wastePercent/100)`; **`wastePercent = null` → hiện `—`**, không tính bừa |
| `Σ món … g` | tổng cột Sống sạch của món đang chọn |
| `Thực đơn đã lưu` | `MenuTemplate` của chính NVDD |

**Số trong ảnh mẫu chỉ là minh họa** — phải tính bằng engine; kiểm tra tổng các món = tổng bữa.

---

## 4. ⚠️ ĐIỂM CHẶN — XỬ ĐÚNG, ĐỪNG TỰ CHẾ

### 4.1 "Ghi chú" theo dòng thực phẩm — hiện CHƯA CÓ
`MenuItemInput` hiện chỉ có `{foodId, itemName, dishName, grams, wastePercent, nutrients}`.
→ Thêm trường **tùy chọn trong JSON**: `note?: string` (và `category?: string` theo tài liệu 13). JSON nên **không cần migration**. **KHÔNG** thêm cột vào bảng `MenuTemplateItem`.

### 4.2 "Thực phẩm mới — dùng ngay" **KHÔNG được ghi vào bảng `Food`**
Bảng `Food` là **dữ liệu nền VDD (3.719 bản ghi, seed)** — không phải nơi người dùng thêm bừa.
→ Popover này tạo **món nhập tay dùng một lần**: item với `foodId = null`, `itemName` do người dùng gõ, dinh dưỡng lấy từ ô `kcal / 100 g` người dùng nhập; chỉ tồn tại trong JSON thực đơn.
→ Các chỉ tiêu **không được nhập → `—`** (không suy ra 0).
→ Nếu sau này cần thêm thực phẩm vào dữ liệu nền thì là **việc quản trị riêng**, phải hỏi chủ dự án. **Không tự làm trong màn này.**

### 4.3 `0 kcal` vs `—`
Ảnh mẫu có "Dưa hấu 0 kcal". Chỉ hiện `0` khi dữ liệu **thật sự bằng 0**; nếu `Food.energyKcal = null` → **`—`**. Luật vàng: thiếu dữ liệu không được hiện số 0 giả.

### 4.4 Nút `AI (Dán mô tả / ảnh)`
Chưa có backend AI → **disabled + tooltip "sẽ kết nối sau"**. Không gọi dịch vụ ngoài, không thêm API key, không tự dựng OCR.

### 4.5 Tự lưu / bản nháp
Xem **mục 4.1 của tài liệu 13** — `DietMeal` chưa có field nháp và `menu.ts:17` chặn ghi đè `menuSnapshotJson`. **Phải hỏi chủ dự án** trước khi thêm migration `menuDraftJson`. Tuyệt đối **không nới lỏng chốt chặn snapshot**.

### 4.6 `+ Món / Đồ ăn nhanh` và `Món ăn` (tìm kiếm)
Dùng dữ liệu `Dish` + `DishIngredient` đã seed (7.369 món): chọn món → **đổ toàn bộ công thức** thành các dòng thực phẩm (như `addDishRecipe` hiện có), ghi chú tự điền `Từ công thức: <tên món>` đúng như ảnh.

---

## 5. Ràng buộc

- Giữ nguyên hợp đồng `approveMenuAction`, `saveTemplateAction`, `deleteTemplateAction` (tên action + field). `Sang phân tích` chỉ chuyển bước, **không** tự duyệt.
- **KHÔNG** sửa `packages/nutrition-engine`, schema/migration cũ, hay các màn `/quan-ly`, `/quan-tri`, `/bao-suat`, `/bep`, `/kho`, `/bao-cao`, `/ho-so`, `/k`.
- Snapshot đã duyệt **bất biến**; món đã duyệt → bảng chuyển chỉ-đọc + nhắc "copy sang bữa chưa duyệt".
- Tìm kiếm: **API search có limit**, không bơm 3.719 foods / 7.369 dishes xuống client.
- Mật độ cao (desktop ~1280px); a11y: ô số có `aria-label`, nút icon có nhãn, `⋮` menu bàn phím dùng được, focus rõ.

## 6. Nghiệm thu

- `npm run build` + `typecheck` + `lint` sạch; `npm test` xanh.
- Kịch bản: thêm món → thêm thực phẩm từ tìm kiếm → sửa gram → **`Mua/kho` tự đổi đúng công thức** → thêm ghi chú dòng → thực phẩm thiếu `%thải bỏ` hiện `—` → `Đạt/Thiếu/Vượt` đổi theo ngưỡng của mã → lưu mẫu → duyệt (snapshot + AuditLog).
- Thêm "thực phẩm mới dùng ngay" → **bảng `Food` không phát sinh bản ghi nào** (kiểm bằng đếm trước/sau).
