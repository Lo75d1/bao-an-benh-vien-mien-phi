# 15 — THỐNG NHẤT GIAO DIỆN (mỗi trang đang một kiểu)

> Chỉ dẫn cho agent triển khai (Codex). Đọc kèm `AGENTS.md`, `10-ui-ux-guidelines.md`.
> **Vấn đề chủ dự án báo sau khi cài lên VPS: "mỗi trang mỗi kiểu".** Dưới đây là kết quả rà code — có số đo, không phải cảm tính.

---

## 0. GỐC THIẾT KẾ: lấy theo trang tính khẩu phần 2598

Chủ dự án chốt: **khoảng cách dòng/hàng, cỡ chữ, phông chữ lấy theo trang tính–lên thực đơn của `dinhduong2598`**, rồi cân mật độ thông tin cho hợp.

### Số đo THẬT lấy từ `../web-m2-rap/src/app/globals.css`

```css
:root {
  --background:     #f1f6f4;   /* nền giấy */
  --foreground:     #111827;   /* = --ink, chữ chính */
  --institution:    #123c36;   /* xanh rêu thương hiệu */
  --clinical-teal:  #0f5c51;   /* teal nhấn */
  --clinical-mint:  #dcebe5;   /* nền nhạt/hover */
  --clinical-line:  #9bb6ab;   /* viền */
  --clinical-paper: #ffffff;   /* mặt thẻ/bảng */
}
@theme inline {                 /* Tailwind v4 CSS-first */
  --font-sans: "Times New Roman", Times, serif;
  --font-mono: "Courier New", Courier, monospace;
}
body { font-size: 17px; line-height: 1.5; }
button, a, input, select, textarea { transition: … 160ms ease; }
button:not(:disabled):active, a:active { transform: translateY(1px); }
```

### Điều quan trọng NHẤT học từ 2598
2598 chỉ có **9 khai báo `font-size`** trong toàn bộ CSS (app báo ăn: **52**), và **màu đều là biến đặt tên** (app báo ăn: **700 lần hardcode**).
→ Vì 2598 **không tự chế CSS cho từng trang**: mọi cỡ chữ/khoảng cách đều dùng **utility Tailwind**, CSS chỉ giữ token + vài lớp đặc thù.
**Đây chính là cách sửa gốc rễ của "mỗi trang mỗi kiểu" — bắt buộc áp dụng.**

### Thang áp dụng cho app báo ăn (2598 làm gốc, chỉnh mật độ)

Giữ **phông, màu, nhịp 1.5, hiệu ứng 160ms** của 2598. Riêng **cỡ chữ hạ một bậc so với 17px** vì màn báo ăn phải chứa 9–15 mã chế độ/bữa:

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--fs-base` | **15px** | chữ thân, nhãn, form |
| `--fs-table` | **14px** | dòng dữ liệu trong bảng (khẩu phần, danh sách khoa) |
| `--fs-sm` | **13px** | chú thích, dòng phụ, badge |
| `--fs-lg` | **19px** | tiêu đề mục |
| `--fs-xl` | **24px** | tiêu đề trang |
| `--lh` | **1.5** | mặc định (bảng dày có thể 1.35) |
| chiều cao hàng bảng | **36–40px** | đủ đọc, vẫn xem được nhiều dòng |
| padding ô bảng | **6px 10px** | — |

### ✅ PHÔNG CHỮ — ĐÃ CHỐT: dùng **serif giống hệt 2598**

```css
--font-sans: "Times New Roman", Times, serif;   /* toàn app, thay "Noto Sans" */
--font-mono: "Courier New", Courier, monospace; /* cột số nếu cần */
```
- Gỡ `"Noto Sans"` khỏi `globals.css` và bỏ `@import "@fontsource/noto-sans/*"` **nếu không còn chỗ nào dùng** (nhớ giữ font cho xuất PDF nếu bản PDF đang phụ thuộc — kiểm trước khi xóa dependency).
- **Cột số** (suất, gram, kcal, %): luôn đặt `font-variant-numeric: tabular-nums` để số thẳng hàng. Nếu số serif ở cỡ nhỏ nhìn chật trong bảng dày, cho phép dùng `--font-mono` **riêng cho cột số** — vẫn là token của 2598, không đẻ phông thứ ba.

---

## 1. Bằng chứng (đo trên `apps/meal-service/src`)

| Chỉ số | Hiện tại | Mức lành mạnh |
|---|---|---|
| Số **cỡ chữ** khác nhau khai báo trong CSS | **52** | 5–7 |
| Số lần **màu hardcode** (`#rrggbb`) | **700** (`#123c36`×69, `#667772`×40, `#0f6e56`×35, `#52645f`×34 …) | ~0 (dùng token) |
| Số **file CSS** rời | **9** (`globals` 294 · `quan-ly` 191 · `quan-tri` 183 · `bao-suat` 79 · `kitchen` 54 · `warehouse` 48 · `reports` 30 · **`thuc-don-v13.css`** · **`thuc-don-v14.css`**) | 1 nền + rất ít |
| Trang **không dùng** một component `ui/*` nào | **9/11** (`bao-cao`, `bao-suat`, `bep`, `kho`, `lich`, `quan-ly`, `quan-tri`, `quan-tri/audit`, `thuc-don`) | 0 |
| Primitive shadcn **chết hẳn** (0 file dùng) | `sheet`, `sidebar`, `breadcrumb`, `table` | — |
| Component dùng chung **bị bỏ rơi** | `confirm-submit-button` (0), `diet-evaluation` (0) | — |

### Hai triệu chứng nặng nhất

**a) Hai hệ thiết kế song song chỉ cho màn thực đơn.**
`thuc-don-v13.css` và `thuc-don-v14.css` đặt tên class theo **số hiệu tài liệu**: `.diet-code-v13`, `.menu-command-v13`, `.dish-tree-v14`, `.ingredient-row-v14`, `.single-command-v14`… → chế độ "Nhiều mã" và "Một mã" **không dùng chung một thứ gì**, dù là hai chế độ của cùng một màn.

**b) Nền tảng đã dựng nhưng bị bỏ qua.**
U1 đã cài **17 primitive shadcn + token màu/radius theo brand**; V2 đã có `DataTable`; U6 có `presentation.tsx`. Nhưng phần lớn trang vẫn tự dựng `<button>/<input>/<table>` với viền + màu riêng. Kết quả: cùng một "cái nút", mỗi trang một hình.
(Còn sống: `presentation` 13 file, `data-table` 5 file, `dialog` 7 file — giữ và mở rộng những cái này.)

---

## 2. Việc phải làm — thống nhất, KHÔNG viết lại nghiệp vụ

### Bước 1 — Một tầng token duy nhất
Trong `globals.css`, định nghĩa **một lần**: bảng màu (nền, chữ, viền, primary `#123c36`, accent `#0f6e56`, cảnh báo hổ phách, nguy hiểm đỏ), radius, spacing, và **thang cỡ chữ 6 bậc** (ví dụ `--fs-xs .68rem` · `--fs-sm .75rem` · `--fs-base .82rem` · `--fs-md .95rem` · `--fs-lg 1.15rem` · `--fs-xl 1.4rem`).
→ Tận dụng biến shadcn đã có sẵn từ U1, **không đẻ hệ biến thứ hai**.

### Bước 2 — Quét sạch hardcode
Thay **toàn bộ 700 chỗ** `#rrggbb` và **52 cỡ chữ** bằng token ở Bước 1. Sau bước này, tìm `#` trong CSS gần như không còn kết quả.

### Bước 3 — Gộp CSS
- **XÓA** `thuc-don-v13.css` và `thuc-don-v14.css`; chọn **MỘT** hệ lớp dùng chung cho cả hai chế độ thực đơn (bỏ hậu tố `-v13`/`-v14` khỏi mọi class).
- Gộp `kitchen.css`, `warehouse.css`, `reports.css`, `bao-suat.css`, `quan-ly.css`, `quan-tri.css` → còn **một tầng dùng chung** (bảng, thẻ, thanh công cụ, badge, ô nhập, thanh lệnh dưới) + phần riêng của trang chỉ giữ cái thật sự đặc thù.
- **Quy tắc từ nay: không thêm file CSS mới cho mỗi trang, không đặt tên class theo phiên bản/số tài liệu.**

### Bước 4 — Dùng lại component chung
Mọi trang phải lấy từ `components/ui/*` + `components/presentation.tsx`:
`Button`, `Input`, `Select`, `Card`, `Badge`, `Dialog`, `Tabs`, `Tooltip`, `Skeleton`, `DataTable`, `PageHeader`, `EmptyState`, `DietName`, badge trạng thái.
→ Cấm tự dựng `<button>/<input>/<table>` có viền + màu riêng khi đã có primitive tương ứng.
→ `confirm-submit-button` và `diet-evaluation` đang chết: hoặc **dùng lại**, hoặc **xóa hẳn** — không để code mồ côi.

### Bước 5 — Chốt một khung điều hướng
`app-shell.tsx` hiện đã là **thanh nav ngang** (khớp bản thiết kế đã duyệt). → Giữ **duy nhất** kiểu này cho mọi role; **xóa** các primitive nav không còn dùng (`sidebar`, `sheet`, `breadcrumb`) để không ai dựng nav thứ hai.

### Bước 6 — Đồng bộ bố cục trang
Mọi trang theo cùng một khuôn:
`PageHeader` (tiêu đề + mô tả + hành động) → thanh ngữ cảnh/bộ lọc → nội dung (bảng/lưới) → thanh lệnh dưới (nếu có).
Cùng một mật độ: dòng bảng, padding, cỡ chữ lấy từ token — **không trang nào tự nới/thu riêng**.

---

## 3. Cách làm (tránh vỡ)

Làm **tuần tự, mỗi bước một commit, build+test xanh mới sang bước sau**:
1. Thêm token (chưa đụng trang nào) → build xanh.
2. Chuyển `globals.css` sang token.
3. Chuyển từng trang: `quan-ly` → `quan-tri` → `thuc-don` (gộp v13+v14) → `bao-suat` → `bep` → `kho` → `bao-cao` → `lich` → `ho-so` → `/k`.
4. Xóa CSS/primitive đã chết.

**KHÔNG** đổi nghiệp vụ, server action, schema, `nutrition-engine`, quyền, luật `—`. Đây thuần túy là **thống nhất trình bày**.

---

## 4. Nghiệm thu (đo lại bằng đúng các lệnh này)

```bash
# 1) cỡ chữ khác nhau — phải ≤ 8
grep -ohE 'font-size:[^;}]+' src/app/**/*.css src/app/*.css | sort -u | wc -l
# 2) màu hardcode — phải ≈ 0 (chỉ còn trong phần định nghĩa token)
grep -ohE '#[0-9a-fA-F]{6}' src/app/**/*.css src/app/*.css | wc -l
# 3) không còn file/class theo phiên bản — phải rỗng
ls src/app/\(app\)/thuc-don/*v1*.css 2>/dev/null ; grep -rn -- '-v13\|-v14' src/ | head
# 4) trang không dùng ui/* — phải là 0
for f in $(find "src/app/(app)" -name page.tsx); do [ "$(grep -c '@/components/ui/' "$f")" = 0 ] && echo "$f"; done
```
Kèm: `npm run build` + `typecheck` + `lint` sạch, `npm test` xanh, và **giao diện các trang nhìn cùng một hệ** (cùng cỡ chữ, cùng nút, cùng bảng, cùng badge).
