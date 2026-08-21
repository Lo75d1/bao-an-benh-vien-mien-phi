# 02 — Target Architecture

## Repo mới: `suat-an-benh-vien` (monorepo công khai, mã nguồn mở)

```
suat-an-benh-vien/                 # 1 repo công khai, workspaces
├─ package.json                    # workspaces: ["packages/*", "apps/*"]
├─ packages/
│  └─ nutrition-engine/            # THƯ VIỆN CHUNG — TS thuần, KHÔNG DB, KHÔNG React
│     ├─ src/
│     │  ├─ nutrient-fields.ts     # (port từ web-m2-rap)
│     │  ├─ quantity.ts            # quy đổi ăn được ↔ mua, %thải bỏ
│     │  ├─ exchange-units.ts      # quy đổi đơn vị ăn
│     │  ├─ recommendation.ts      # đối chiếu nhu cầu theo tuổi/giới
│     │  ├─ diet-evaluation.ts     # ĐÁNH GIÁ mã chế độ: đạt/vượt/thiếu từng chỉ tiêu
│     │  ├─ ration-detail.ts       # gộp bữa→món→thực phẩm, tổng dinh dưỡng
│     │  └─ shopping.ts            # menu × suất → xuất dự kiến (thiếu → "—")
│     ├─ test/                     # port test:ration, test:ration-detail...
│     └─ package.json              # "@suat-an/nutrition-engine"
└─ apps/
   └─ meal-service/                # app Next.js (báo ăn)
      ├─ prisma/schema.prisma
      ├─ data/reference/*.jsonl    # data nền công khai (seed)
      ├─ scripts/seed*.ts
      ├─ src/app/...               # routes theo role
      ├─ src/lib/...               # tầng server (DB, auth, orchestration)
      └─ src/components/...
```

### Vì sao monorepo (không phải 3 repo)
- Vẫn là **repo riêng** tách khỏi web dinh dưỡng ✓
- Vẫn có **engine dùng chung** (package nội bộ, `workspace:*`) ✓ — không cần publish npm ngay
- **Ít việc vận hành nhất**: 1 CI, 1 chỗ version, không lệch package
- Web dinh dưỡng (`web-m2-rap`) **giữ nguyên**; sau này muốn dùng engine → publish package từ monorepo này ra npm rồi `web-m2-rap` cài vào (không bắt buộc trong giai đoạn này).

### Ranh giới `nutrition-engine` (rất quan trọng)
- **CHỈ** hàm thuần: nhận số liệu → trả số liệu/đánh giá. Không `import "server-only"`, không Prisma, không `fetch`, không React.
- Test chạy độc lập bằng `tsx`/`vitest`, không cần DB.
- App `meal-service` gọi engine ở **cả server và client** (được, vì thuần).
- Data nền (Food/DietCode) do APP nạp từ DB rồi **truyền vào** engine — engine không tự đọc DB.

## Ngăn xếp
- Next.js (App Router) + TypeScript + Tailwind (đồng bộ design-language với web dinh dưỡng: xanh rêu `#123c36`, thẻ viền mảnh, teal `#0f6e56`).
- Prisma + Postgres **riêng** (Docker Compose, giống bản demo đã dựng: `app + db + migrate + seed`).
- Ảnh/chứng từ: object storage (Supabase Storage hoặc tương đương) — nếu chưa cấu hình thì ảnh "nằm im", app không lỗi.
- Không dùng thư viện chart ngoài — SVG/div thuần (theo skill dataviz).

## Môi trường & triển khai
- **Deploy phải reproducible** (bài học demo cũ): mọi bản vá (engine Prisma pre-bake, MTU, migration) **nằm trong repo**, `git clone` + `docker compose up` là chạy.
- 1 lệnh seed nạp data nền + cấu hình mẫu + tài khoản demo (in mật khẩu).
- Demo công khai để "mọi người nắm cách làm".

## Nguyên tắc kỹ thuật
- **Audit ở tầng data**: mọi thao tác nghiệp vụ ghi `AuditLog` trong cùng transaction.
- **Soft-delete**: entity nghiệp vụ có `status` + `voidedBy/At/Reason`, không xóa cứng.
- **Snapshot**: khi NVDD duyệt thực đơn → đóng băng vào `DietMeal.menuSnapshotJson` (lịch sử bất biến).
- **Không đoán số**: engine + UI trả "—"/cảnh báo khi thiếu dữ liệu.
- **Feature flags** cho phần chưa dùng (sonde, kho Mode B, AI đọc bill).
