# 🏠 TRANG CHỦ DỰ ÁN — Hệ Suất Ăn Bệnh Viện (`suat-an-benh-vien`)

> **Đọc file này trước, rồi theo link đi tiếp — mọi tài liệu báo ăn gom ở đây, không phải tìm tùm lum.**
> File này chỉ là **bản đồ chỉ đường** (không dời file gốc). Vị trí: `web-m2-rap/docs/bao-an-redesign/00-PROJECT-HOME.md`.

## Dự án là gì
Số hóa quy trình cấp suất ăn bệnh viện, **làm lại thành repo RIÊNG, CÔNG KHAI `suat-an-benh-vien`** (monorepo mã nguồn mở + engine tính khẩu phần dùng chung). Tách khỏi web dinh dưỡng `dinhduong2598.food` (vẫn chạy bình thường).

## 🚦 Trạng thái hiện tại (2026-08-19)
- **Phase 0 (Audit):** ✅ xong.
- **Phase 1 (Thiết kế):** ✅ xong — bộ 11 tài liệu bên dưới.
- **Đang chờ:** người dùng **duyệt → giao Codex chạy M0** (dựng repo mới + engine + data nền + auth + cài Taste Skill).
- Repo mới **chưa tạo** (docs tạm để ở đây, sẽ chuyển sang khi tạo).

---

## 1) 📐 Bộ thiết kế Phase 1 — BẮT ĐẦU ĐỌC Ở ĐÂY
| # | File | Nội dung |
|---|---|---|
| — | [README](README.md) | Index + nguyên tắc + 6 quyết định đã khóa |
| 01 | [Current-State Audit](01-current-state-audit.md) | KEEP/REFACTOR/REPLACE — tái dùng gì |
| 02 | [Target Architecture](02-target-architecture.md) | Monorepo + engine chung + ranh giới |
| 03 | [Domain Model](03-domain-model.md) | **MealEvent→DietMeal**, Kho, Evidence, Audit |
| 04 | [Permission Matrix](04-permission-matrix.md) | 4 role × hành động |
| 05 | [Information Architecture](05-information-architecture.md) | Điều hướng theo role + lịch tuần |
| 06 | [User Flows](06-user-flows.md) | 6 luồng nghiệp vụ |
| 07 | [Wireframes](07-wireframes.md) | PC + mobile |
| 08 | [Migration Plan](08-migration-plan.md) | Port sang repo mới, không phá data |
| 09 | [Codex Milestones](09-codex-milestones.md) | M0–M9 + **Setup Taste Skill** |
| 10 | [UI/UX Guidelines](10-ui-ux-guidelines.md) | Chuẩn taste riêng dự án |

## 2) 🗂️ Tài liệu lịch sử / tham khảo (bản CŨ — đã bị bộ Phase 1 thay, giữ để tra cứu)
Nằm ở **repo cũ `D:\datanutrition\web\docs\`**:
- `handoff-suat-an-m1-delta-beds.md` — spec M1 (đã bỏ mức giường)
- `spec-cau-noi-m2-tinh-khau-phan.md` — cầu nối M2 ↔ tính khẩu phần
- `handoff-m2-doi-huong-rap-tinh-khau-phan.md` — đổi hướng M2
- `ZALO_MEAL_ORDER_*.md` — khảo sát báo ăn qua Zalo (đã gác)

## 3) 📸 Bằng chứng nghiệm thu (các đợt build trước, trong `web-m2-rap/evidence/`)
- [bao-an-chi-dinh](../../evidence/bao-an-chi-dinh/README.md) · [bao-an-m2](../../evidence/bao-an-m2/README.md) · [bao-suat-ui](../../evidence/bao-suat-ui/README.md) · [tinh-chinh-bao-an](../../evidence/tinh-chinh-bao-an/README.md)

## 4) 🚀 Deploy / demo (bản demo CŨ — sẽ bị demo repo mới thay)
- [docs/DEPLOY_DEMO.md](../DEPLOY_DEMO.md) — runbook demo tự chứa (Postgres riêng)
- [DEPLOY_VPS.md](../../DEPLOY_VPS.md) — deploy VPS chung
- ⚠️ Việc lẻ tồn của demo cũ (footer PC07, seed foods trên VPS) → **thuộc demo cũ, bỏ được.**

## 5) 🧬 Data nguồn (seed cho repo mới)
- JSON offline đã dọn: `D:\datanutrition\du-lieu-nguon\offline-json\dinhduong-offline-full_2026-08-04.json`
- jsonl đã trích (foods/dishes/ingredients): `web-m2-rap/data/reference/*.jsonl` — xem [data/reference/README](../../data/reference/README.md)
- Ghi chú data (quy ước, bẫy): [README-data.md](../../README-data.md)

## 6) 🧠 Bộ nhớ Claude liên quan (persistent, `.claude/.../memory/`)
- `bao-an-tach-repo-cong-khai.md` — **đổi hướng + 4 quyết định đã khóa + quan hệ 2 repo** (mới nhất)
- `suat-an-m1-delta-giuong.md` — lịch sử build M1/M2 (hệ cũ in-place)
- `control-du-an-codex.md` — quy trình Claude ↔ Codex
- `cach-lam-viec-lam-ro-truoc.md` — hỏi làm rõ + chốt đủ điều kiện trước khi làm

---

## ❌ KHÔNG thuộc dự án này (tránh nhầm)
- `dinhduong2598.food` (repo `web-m2-rap` phần **Nửa A**: tra cứu thực phẩm, tính khẩu phần) — web đang chạy, KHÔNG đụng.
- Trạng thái web dinh dưỡng: [PROJECT_STATUS.md](../../PROJECT_STATUS.md) · [CLAUDE_HANDOFF.md](../../CLAUDE_HANDOFF.md) · [REBUILD_SPEC.md](../../REBUILD_SPEC.md)
- Bot tri thức dinh dưỡng: [docs/KNOWLEDGE_BOT_ARCHITECTURE.md](../KNOWLEDGE_BOT_ARCHITECTURE.md)

## Việc tiếp theo
👉 Duyệt bộ Phase 1 (mục 1) → tôi soạn handoff-prompt giao Codex chạy **M0**.
