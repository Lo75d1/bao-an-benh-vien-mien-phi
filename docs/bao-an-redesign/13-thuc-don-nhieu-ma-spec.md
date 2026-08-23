# 13 — NVDD "THỰC ĐƠN · NHIỀU MÃ": spec giao diện đã được duyệt

> Chỉ dẫn cho agent triển khai (Codex). Đọc kèm `AGENTS.md`, `11-port-ui-tinh-khau-phan.md`, `10-ui-ux-guidelines.md`.
> **Chủ dự án đã duyệt bố cục này — bám sát.** Đây là màn giải quyết lỗi "Nhiều mã không nhập được" ở tài liệu 11.

---

## 1. Khung trang

```
┌ HEADER: ◉ Suất ăn bệnh viện   [Thực đơn] Lịch tuần  Kho  Báo cáo        (◯) Dinh dưỡng ▾ ┐
├ [Một mã │ NHIỀU MÃ]        ①·Lập thực đơn ▶      ②·Phân tích & báo cáo   ────────────────┤
├ 📅 23/08/2026 · Bữa trưa · Ăn đường miệng · ✓Tự lưu    4 mã · 286 suất  [Thông tin khuyến nghị ✓] [🛒 Tổng hợp đi chợ] ┤
├──────────────── DANH SÁCH MÃ (~75%) ────────────────┬──── ĐI CHỢ (~25%) ────┤
│ ⠿ ⌄ ①  CƠM_THƯỜNG · Cơm thường [124 suất]  642 kcal/suất  ⧉ ⧉+ 🗑 │ 🛒 Tổng hợp đi chợ·Bữa trưa │
│    ┌Món chính─┐┌Món mặn────┐┌Canh──────┐┌Rau/tráng miệng┐┌ + món ┐ │ [Toàn bữa][Theo mã]         │
│    │Cơm 258   ││Cá thu kho ││Canh bí đỏ││Rau cải luộc 88│└(nét đứt)│ Thực phẩm │ Khối lượng mua  │
│ ⠿ ⌄ ②  CHÁO · Cháo [68 suất] …                                     │ Gạo        24,8 kg          │
│ ⠿ ⌄ ③  ĐTĐ · Đái tháo đường [52 suất] «Sao chép từ CƠM_THƯỜNG» …   │ ⚠ 2 TP thiếu tỷ lệ thải bỏ ⌄│
│ ⠿ › ④  ĂN_MỀM · Ăn mềm [42 suất] «Sao chép từ CƠM_THƯỜNG» (thu gọn)│ [Chuyển danh sách sang Bếp] │
├────────────────────────────────────────────────────────────────────┴─────────────────────────────┤
│ Đang chỉnh: ĐTĐ · Bữa trưa   [Bộ lọc][Thực phẩm][Món ăn]  [🔍 VD: cá chép, sữa chua; gõ không dấu được]  [Nhập tay][AI]  [Mở mã đang chọn ›] │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Cốt lõi (đây là thứ phải đạt):** tất cả mã của bữa nằm trên **một màn**, mở/thu từng mã, nhập ngay tại chỗ, sao chép nền sang mã khác, và chốt hàng loạt. **KHÔNG bắt người dùng nhảy qua lại từng mã.**

---

## 2. Thành phần

### 2.1 Thanh trên
- Nav ngang theo role **DIETITIAN**: `Thực đơn` (đang mở) · `Lịch tuần` · `Kho` · `Báo cáo`. Giữ nguyên nav của các role khác.
- Toggle **`Một mã` | `Nhiều mã`** — cả hai chế độ đều **nhập được** (xem tài liệu 11).
- **Wizard 2 bước**: `① Lập thực đơn` → `② Phân tích & báo cáo`. Bước ② chính là chỗ đặt các thành phần **bê từ 2598** (`RationDetail`, `DietCodeComparison`, `EnergyDistribution`, `ExchangeUnits`, `MicronutrientComparison`) theo tài liệu 11.

### 2.2 Thanh ngữ cảnh
Ngày · Bữa · Đường nuôi · trạng thái **Tự lưu** | `n mã · N suất` | nút `Thông tin khuyến nghị` (mở Dialog ngưỡng của các mã) | nút `Tổng hợp đi chợ`.

### 2.3 Thẻ mã chế độ (lặp cho từng mã)
- Hàng đầu: `⠿` kéo-thả đổi thứ tự · `⌄/›` mở-thu · số thứ tự · **MÃ** · tên chế độ · badge `n suất` · `kcal/suất` · nút **copy** (⧉), **nhân bản sang mã khác** (⧉+), **xóa** (🗑 đỏ).
- Mã được tạo từ nền của mã khác: hiện badge **`Sao chép từ <MÃ>`**.
- Thân thẻ: các **thẻ món xếp ngang theo nhóm** (`Món chính`, `Món mặn`, `Canh`/`Canh súp`, `Rau / tráng miệng`), mỗi thẻ hiện tên món + `kcal/suất`; cuối cùng là ô nét đứt **`+ món`**.

### 2.4 Panel đi chợ (phải)
- Tabs **`Toàn bữa`** | **`Theo mã`**.
- Bảng `Thực phẩm | Khối lượng mua` (đơn vị **kg**, 1 số lẻ).
- Cảnh báo hổ phách gộp: `⚠ n thực phẩm thiếu tỷ lệ thải bỏ` (bấm xổ danh sách).
- Ghi chú công thức: *"Khối lượng mua = định lượng sống sạch × số suất, tách theo mã và cộng toàn bữa."*
- Nút chính **`Chuyển danh sách sang Bếp`**.

### 2.5 Thanh lệnh dưới (sticky)
`Đang chỉnh: <MÃ> · <Bữa>` | `Bộ lọc` | `Thực phẩm` | `Món ăn` | ô tìm kiếm (**gõ không dấu được**) | `Nhập tay` | `AI` | `Mở mã đang chọn ›`.

---

## 3. Ánh xạ dữ liệu (không được bịa)

| UI | Nguồn |
|---|---|
| `23/08/2026 · Bữa trưa · Ăn đường miệng` | `MealEvent.mealDate` · `MealType.name` · `feedingRoute` |
| `4 mã · 286 suất` | số `DietMeal` của (MealEvent × route) · Σ `DietMeal.servingsPlanned` |
| `124 suất` mỗi mã | `DietMeal.servingsPlanned` |
| `642 kcal/suất` mỗi mã | tính từ item của mã đó qua **engine** (`calculateMenuTotals`) — mỗi suất, không nhân số suất |
| `258 kcal/suất` mỗi thẻ món | tổng năng lượng các thực phẩm thuộc món đó |
| Ngưỡng ở `Thông tin khuyến nghị` | `DietType.dietCodeRef` (mỗi mã một ngưỡng riêng) |
| Bảng đi chợ | engine `buildKitchenShoppingList` — **khối lượng mua = gram sống sạch ÷ (1 − %thải bỏ) × số suất**, đổi ra kg |
| `n thực phẩm thiếu tỷ lệ thải bỏ` | item có `wastePercent = null` → **không tính được khối lượng mua** → hiện `—` + đếm vào cảnh báo |

---

## 4. ⚠️ HAI ĐIỂM CHẶN — PHẢI XỬ ĐÚNG, ĐỪNG TỰ CHẾ

### 4.1 "Tự lưu" hiện KHÔNG có chỗ để lưu
`DietMeal` **không có field bản nháp**. Chỉ có `menuSnapshotJson` (đặt lúc duyệt) và `approvedAt`.
Và `src/lib/menu.ts:17` đang chặn:
```ts
if (meal.approvedAt || meal.menuSnapshotJson) throw new Error("Thực đơn đã duyệt có snapshot bất biến và không thể ghi đè.");
```
→ **Nếu tự lưu ghi vào `menuSnapshotJson` thì nút Duyệt sẽ hỏng.** Ba lựa chọn:
- **(A) Khuyến nghị:** thêm field mới `menuDraftJson Json?` vào `DietMeal` bằng **migration THÊM MỚI** (không sửa migration cũ, không đụng `menuSnapshotJson`). Tự lưu ghi vào nháp; duyệt mới đóng băng snapshot → giữ nguyên luật bất biến.
- (B) Chỉ tự lưu ở trình duyệt (localStorage): không cần migration nhưng mất bản nháp khi đổi máy.
- (C) Nới lỏng chốt chặn ở `menu.ts` — **KHÔNG được làm**, phá luật snapshot bất biến.

**→ Chọn (A) hoặc (B); phải HỎI chủ dự án trước khi thêm migration. Không tự ý đổi `menu.ts`.**

### 4.2 Không có ảnh thực phẩm trong dữ liệu
Bảng `Food` **không có field ảnh**. Hình món trong ảnh mẫu là minh họa.
→ Dùng **icon/khối màu trung tính theo nhóm món**. **KHÔNG** bịa ảnh, **KHÔNG** tải ảnh từ internet, **KHÔNG** thêm cột ảnh nếu chưa được duyệt.

### 4.3 Nhóm món ("Món chính / Món mặn / Canh / Rau")
Hiện item chỉ có `dishName`, chưa có nhóm.
→ Thêm trường **tùy chọn** `category?: string` **trong JSON** của item (`menuSnapshotJson` / `menuDraftJson`) — JSON nên **không cần migration**. **KHÔNG** thêm cột vào bảng `MenuTemplateItem`.

### 4.4 "Chuyển danh sách sang Bếp" nghĩa là gì
Bếp đã tự đọc đi chợ từ snapshot đã duyệt (M4). → Nút này = **duyệt hàng loạt các mã đang chọn** (gọi lại `approveMenuAction` cho từng mã, mỗi mã vẫn snapshot riêng + AuditLog riêng). **KHÔNG tạo khái niệm "bàn giao" mới, không thêm bảng mới.**

### 4.5 Nút `AI`
Chưa có backend AI → để **disabled + tooltip "sẽ kết nối sau"**. Không gọi dịch vụ ngoài, không thêm API key.

---

## 5. Ràng buộc

- Giữ nguyên hợp đồng server action: `approveMenuAction`, `saveTemplateAction`, `deleteTemplateAction` (tên action + tên field). Duyệt hàng loạt = gọi lặp, không viết lại luồng duyệt.
- **KHÔNG** sửa `packages/nutrition-engine` (chỉ dùng), **KHÔNG** sửa migration cũ, **KHÔNG** đụng `/quan-ly`, `/quan-tri`, `/bao-suat`, `/bep`, `/kho`, `/bao-cao`, `/ho-so`, `/k`.
- Snapshot đã duyệt **bất biến**; thiếu dữ liệu → `—`; ghi `AuditLog` mỗi lần duyệt.
- Tìm kiếm: **không bơm cả bảng foods/dishes xuống client** — dùng API search có limit (xem tài liệu 11).
- Mật độ cao (desktop ~1280px), a11y: kéo-thả phải có phương án bàn phím, nút icon có `aria-label`, tab list đúng ARIA, focus rõ.

## 6. Nghiệm thu

- `npm run build` + `typecheck` + `lint` sạch; `npm test` xanh.
- Kịch bản thật: bữa có ≥3 mã → dựng nền ở mã 1 → **sao chép sang 2 mã khác** → sửa gram riêng từng mã → panel đi chợ đổi theo (`Toàn bữa` và `Theo mã` khớp nhau) → **duyệt hàng loạt** → mỗi mã có snapshot + AuditLog riêng.
- Thực phẩm thiếu `%thải bỏ` → khối lượng mua hiện `—` và được đếm vào cảnh báo.
