# AGENTS.md — Hiến chương cho agent (Codex đọc mỗi phiên)

> Repo: **`suat-an-benh-vien`** — hệ suất ăn bệnh viện, monorepo **công khai (mã nguồn mở)**.
> Đây là repo RIÊNG, tách khỏi web dinh dưỡng `dinhduong2598.food`.

## 0. ĐỌC TRƯỚC KHI LÀM BẤT CỨ VIỆC GÌ
1. **[docs/bao-an-redesign/00-PROJECT-HOME.md](docs/bao-an-redesign/00-PROJECT-HOME.md)** — bản đồ toàn dự án.
2. **[09-codex-milestones.md](docs/bao-an-redesign/09-codex-milestones.md)** — việc của bạn chia theo M0→M9 (làm ĐÚNG milestone được giao).
3. **[03-domain-model.md](docs/bao-an-redesign/03-domain-model.md)** + **[10-ui-ux-guidelines.md](docs/bao-an-redesign/10-ui-ux-guidelines.md)** — data model + chuẩn UI.
Tài liệu thiết kế trong `docs/bao-an-redesign/` là **NGUỒN SỰ THẬT**. Không tự chế nghiệp vụ/UX.

## 1. SETUP BẮT BUỘC trước khi viết UI
```bash
npx skills add Leonxlnx/taste-skill      # Taste Skill — chống UI "slop" (https://www.tasteskill.dev/)
```
Dùng Taste Skill cho MỌI màn UI, rồi bám thêm `10-ui-ux-guidelines.md` (brand xanh rêu #123c36, teal #0f6e56).

## 2. QUY TRÌNH (governance — KHÔNG được phá)
- Làm trên **nhánh riêng** theo milestone → mở **PR / để lại diff** → **chờ Claude review** → Claude đồng ý mới merge.
- **KHÔNG tự merge vào main. KHÔNG tự deploy. KHÔNG force-push.**
- Mỗi milestone: chỉ đụng đúng phạm vi của nó; đọc mục "KHÔNG được sửa" của milestone đó.
- Một agent / một vùng — không sửa chỗ Claude đang sửa.
- Nghiệm thu: chạy test + build thật; nộp **log + ảnh** (màn nhân viên **desktop ~1280px**, bệnh nhân **mobile ~375px**).

## 3. LUẬT DỮ LIỆU & AN TOÀN (bất di bất dịch)
- **Thiếu dữ liệu → "—" + cảnh báo. TUYỆT ĐỐI KHÔNG đoán số / không hiện 0 giả.**
- **KHÔNG hard-delete dữ liệu nghiệp vụ** — chỉ Hủy/Vô hiệu/Điều chỉnh + lưu người/lúc/lý do.
- **Ghi `AuditLog`** cho mọi thao tác nghiệp vụ (cùng transaction).
- **KHÔNG commit secret** (`.env*`, key, token, connection string) vào git. Nhập secret trực tiếp trên máy/server.
- **KHÔNG PII bệnh nhân** trong module này (bệnh nhân chỉ xem qua QR khoa + gửi ghi chú có duyệt).
- Ảnh/chứng từ = **evidence đính kèm**, KHÔNG phải trạng thái.

## 4. KIẾN TRÚC
- Monorepo workspaces: `packages/nutrition-engine` (TS thuần, KHÔNG DB/React) + `apps/meal-service` (Next.js).
- `nutrition-engine`: hàm thuần, test độc lập không cần DB. App nạp data từ DB rồi TRUYỀN vào engine.
- DB **riêng** (Postgres, Docker Compose). Deploy phải **reproducible** — mọi bản vá nằm trong repo, `git clone` + `docker compose up` là chạy (đọc bài học ở `08-migration-plan.md`).
- 4 role: `ADMIN, DIETITIAN, NURSE, KITCHEN`. **KHÔNG** role `CLINICIAN`/bác sĩ (HIS/EMR sau).

## 5. NEXT.JS Ở ĐÂY KHÁC BẢN BẠN BIẾT
Có breaking changes so với dữ liệu huấn luyện. Đọc guide trong `node_modules/next/dist/docs/` trước khi viết code Next.js. Sau MỌI `prisma migrate/generate` phải restart dev server (cache Prisma Client).

## 6. KHÔNG ĐỤNG
- Repo `../web-m2-rap` (web dinh dưỡng) và `../web` — chỉ ĐỌC tham chiếu khi port engine, KHÔNG sửa.
- Các file/vùng ghi "KHÔNG được sửa" trong milestone đang làm.
