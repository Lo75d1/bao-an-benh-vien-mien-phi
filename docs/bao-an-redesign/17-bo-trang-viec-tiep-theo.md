# 17 — BỎ TRANG TRUNG GIAN "VIỆC TIẾP THEO" (vào thẳng trang chính)

> Chỉ dẫn cho agent triển khai (Codex). Việc nhỏ, làm gọn trong một lần.

## 1. Vấn đề

`app/(app)/page.tsx` hiện là **trang đệm**: chỉ hiện một thẻ "Việc tiếp theo" + nút to dẫn sang trang chính → **tốn thêm một cú bấm vô ích**.

Bằng chứng bất nhất ngay trong code:
```
app/(app)/page.tsx:93   if (user.role === "ADMIN") redirect("/quan-ly");   // ADMIN đã BỎ QUA trang đệm
app/(app)/page.tsx:51   NURSE      → nút "Tới Báo suất"      (vẫn phải bấm)
app/(app)/page.tsx:57   DIETITIAN  → nút "Tới Thực đơn"      (vẫn phải bấm)
app/(app)/page.tsx:64   KITCHEN    → nút "Tới Bếp"           (vẫn phải bấm)
```
Trong khi **thanh nav đã có sẵn trang chính ở mục đầu tiên** của mỗi vai (`app-shell.tsx:15-18`):
`ADMIN → /quan-ly` · `DIETITIAN → /thuc-don` · `NURSE → /bao-suat` · `KITCHEN → /bep`.

→ Trang đệm vừa **thừa**, vừa **không đồng nhất** (ADMIN một kiểu, 3 vai còn lại một kiểu).

## 2. Phải làm

### 2.1 Vào thẳng trang chính
Sau khi đăng nhập, **mọi vai** đi thẳng tới trang làm việc của mình:

| Vai | Vào thẳng |
|---|---|
| ADMIN | `/quan-ly` *(đã có)* |
| DIETITIAN | `/thuc-don` |
| NURSE | `/bao-suat` |
| KITCHEN | `/bep` |

- Áp dụng cho **cả hai đường**: sau khi đăng nhập thành công **và** khi người dùng đã đăng nhập mà mở `/`.
- **`/` khi CHƯA đăng nhập vẫn là trang đăng nhập + ô QR bệnh nhân — giữ nguyên, không được đụng.**

### 2.2 KHÔNG được làm mất mấy con số hữu ích
Các chỉ số đang hiện ở trang đệm phải **dời vào chính trang đích**, đặt gọn ở dải ngữ cảnh dưới tiêu đề trang (không dựng thẻ to chiếm chỗ):

| Vai | Chỉ số phải giữ | Đưa vào |
|---|---|---|
| NURSE | `Tiến độ báo suất n/n bữa`, `Ghi chú chờ duyệt n` | header `/bao-suat` |
| DIETITIAN | số ngày × chế độ **chưa có thực đơn duyệt** | header `/thuc-don` |
| KITCHEN | **bữa đang xử lý** + giờ phục vụ | header `/bep` |

**Tái dùng `lib/overview.ts`** (hàm đọc đã có từ U4) — **không viết lại truy vấn mới**, và **không để nó thành code mồ côi**.

### 2.3 Dọn sạch, không để lại rác
Sau khi bỏ trang đệm: nếu `RoleTask`, `DashboardLink` (và các helper chỉ phục vụ trang đệm) **không còn ai dùng** → **xóa hẳn**.
*(Theo tài liệu 15: không để component mồ côi — repo đang có sẵn `confirm-submit-button`, `diet-evaluation` chết mà chưa dọn.)*

## 3. Ràng buộc

- KHÔNG đổi quyền/scope, server action, schema, `nutrition-engine`.
- Trang đăng nhập `/` (chưa đăng nhập) + **nút đăng nhập nhanh demo** + ô QR bệnh nhân: **giữ nguyên**.
- Giao diện theo **tài liệu 15** (token 2598, phông serif, thang cỡ chữ) — không tạo file CSS mới.

## 4. Nghiệm thu

- `npm run build` + `typecheck` + `lint` sạch; `npm test` xanh.
- Đăng nhập lần lượt 4 tài khoản demo → **vào thẳng** `/quan-ly`, `/thuc-don`, `/bao-suat`, `/bep`; **không còn màn "Việc tiếp theo"** ở giữa.
- Các chỉ số cũ **vẫn thấy được** trên trang đích (không mất).
- Đăng xuất → mở `/` → vẫn ra **trang đăng nhập** bình thường.
- `grep -rn "RoleTask\|DashboardLink" src/` → không còn kết quả mồ côi.
