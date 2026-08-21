> 🏠 Toàn cảnh dự án (gồm cả tài liệu cũ, evidence, data, bộ nhớ) → **[00-PROJECT-HOME.md](00-PROJECT-HOME.md)**.

# Thiết kế lại Hệ Suất Ăn Bệnh Viện — bộ tài liệu Phase 1

> **Trạng thái:** BẢN THIẾT KẾ (Phase 1). **Chưa code, chưa migrate, chưa xóa file.**
> Chờ người dùng duyệt từng phần → rồi mới giao Codex implement theo milestone.

Bộ tài liệu này là **nguồn sự thật** để Codex triển khai **repo mới, công khai: `suat-an-benh-vien`**
(monorepo mã nguồn mở) — tách khỏi web dinh dưỡng hiện tại (`web-m2-rap`, giữ nguyên).

## Đọc theo thứ tự
1. [01 — Current-State Audit](01-current-state-audit.md) — repo hiện có gì, tái dùng được gì.
2. [02 — Target Architecture](02-target-architecture.md) — monorepo, engine chung, ranh giới.
3. [03 — Domain Model](03-domain-model.md) — MealEvent → DietMeal, Kho, Evidence, Audit…
4. [04 — Permission Matrix](04-permission-matrix.md) — 4 role × hành động.
5. [05 — Information Architecture](05-information-architecture.md) — điều hướng từng role.
6. [06 — User Flows](06-user-flows.md) — 6 luồng nghiệp vụ chính.
7. [07 — Wireframes](07-wireframes.md) — PC + mobile các màn quan trọng.
8. [08 — Migration Plan](08-migration-plan.md) — port sang repo mới, không phá data.
9. [09 — Codex Milestones](09-codex-milestones.md) — chia nhỏ, có acceptance + "không được sửa" + **Setup bắt buộc (Taste Skill)**.
10. [10 — UI/UX Guidelines](10-ui-ux-guidelines.md) — chuẩn taste riêng của dự án (dùng cùng Taste Skill).

> **Taste Skill (bắt buộc):** trước khi code, Codex chạy `npx skills add Leonxlnx/taste-skill` (https://www.tasteskill.dev/) để UI không "ngô ngô", rồi bám thêm [doc 10](10-ui-ux-guidelines.md). Ghi vào `AGENTS.md` repo mới ở M0.

## Nguyên tắc bất di bất dịch (áp cho MỌI milestone)
- **Mỗi role đăng nhập phải trả lời ngay: "giờ tôi cần làm gì?"** — không nhồi mọi chức năng vào 1 dashboard.
- **Lịch tuần là trục điều hướng** của mọi role.
- **Không xây hệ song song / trùng lặp.** Tái dùng engine + data nền.
- **Không hard-delete dữ liệu nghiệp vụ** — chỉ Hủy/Vô hiệu/Điều chỉnh + lưu người/lúc/lý do.
- **Audit ở tầng backend/data**, không coi lịch sử hiển thị là audit.
- **Thiếu dữ liệu → "—" + cảnh báo, KHÔNG đoán số.**
- **Ảnh/chứng từ = evidence đính kèm, KHÔNG phải state.**
- **Mobile theo workflow thật**, không thu nhỏ desktop.

## Quyết định đã KHÓA (người dùng chốt 2026-08-18)
| # | Quyết định |
|---|---|
| Repo | Monorepo **công khai** `suat-an-benh-vien` = package `nutrition-engine` + app `meal-service`. Tách khỏi web dinh dưỡng. |
| Data | **DB riêng**, seed **full data nền công khai** (foods 3.719 / dishes 7.369 / ingredients 41.457 / 246 mã chế độ), kèm ghi nguồn VDD/RNI. |
| Số suất | Điều dưỡng báo **theo KHOA** → tự **cộng thành số theo MÃ CHẾ ĐỘ** cho bếp. Vẫn lưu chi tiết từng khoa. Điều dưỡng = người chốt duy nhất. |
| Thực đơn | **Chung toàn viện / mã chế độ** (mô hình DietMeal). |
| Sonde | **"Đường nuôi"** (attribute) — MỘT abstraction xử lý cả ăn thường + sonde, chỉ lọc/bật-tắt. |
| Kho | Nhập/xuất/điều chỉnh + **chứng từ** + **dự kiến vs thực xuất**. KHÔNG tồn kho lô/hạn dùng. |

## Mặc định đang mang theo (sửa được khi review)
- **(5)** Đánh giá thực đơn: Phase đầu dùng **8 cột DietCode sẵn có** (246 dòng) + thiết kế sẵn bảng rule mở rộng.
- **(6)** Bệnh nhân: **QR theo khoa, KHÔNG đăng nhập**; trang công khai kèm ô đăng nhập nhân viên.
- **(7)** **Trưởng khoa = Admin toàn quyền** (giai đoạn này).

## 4 role (bỏ bác sĩ & người nấu)
`ADMIN` (Admin/Trưởng khoa) · `DIETITIAN` (NVDD) · `NURSE` (Điều dưỡng) · `KITCHEN` (Bếp).
Bác sĩ can thiệp qua HIS/EMR về sau.
