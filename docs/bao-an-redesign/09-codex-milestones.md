# 09 — Codex Milestones

Quy tắc giao Codex (§XXI): **mỗi milestone 1 nhánh → PR → Claude review diff → sửa → merge → milestone tiếp.**
Không giao "rewrite toàn bộ". Không để Codex tự quyết UX lớn. Không 2 agent sửa cùng vùng.
Mỗi milestone dưới đây có: **Scope · Files · Depends · Acceptance · Test · KHÔNG được sửa.**

---

## SETUP BẮT BUỘC — chạy TRƯỚC M0 và ở MỌI phiên Codex
> Mục tiêu: UI đẹp ngay từ đầu, không "ngô ngô". Codex **phải kéo công cụ taste về trước khi code**.

1. **Cài Taste Skill** (skill mã nguồn mở chống UI "slop", hỗ trợ Codex — https://www.tasteskill.dev/):
   ```bash
   npx skills add Leonxlnx/taste-skill
   ```
   (Bản v2 mặc định. Nếu cần chỉ định rõ: `npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"`.)
2. **Dùng Taste Skill cho MỌI màn UI** — để nó đọc brief + suy hướng thiết kế trước khi sinh code.
3. **Đọc kèm** [`10-ui-ux-guidelines.md`](10-ui-ux-guidelines.md) — chuẩn taste **riêng của dự án** (brand màu, quy ước "—" không đoán, desktop-vs-mobile theo role, mật độ bảng lâm sàng). Taste Skill lo phần "đẹp chung"; file này lo phần "đúng dự án".
4. **Ghi 2 điều trên vào `AGENTS.md` của repo mới `suat-an-benh-vien`** (một lần, ở M0) để mọi phiên Codex sau đều tự áp — vì Codex không đọc được chat/skill của Claude.
5. Nghiệm thu UI vẫn theo quy ước: màn nhân viên chụp **desktop ~1280px**, bệnh nhân **mobile**.

---

## M0 — Scaffold monorepo + engine + data nền + auth
- **Scope:** **chạy SETUP BẮT BUỘC ở trên** (cài Taste Skill + ghi vào `AGENTS.md`); dựng monorepo workspaces; trích `nutrition-engine` (P1); schema Prisma `init` (P3); seed data nền + tài khoản demo (P2); auth/session + 4 role; Department/Membership/MealType/DietType; Docker Compose (app+db+migrate+seed) reproducible.
- **Files:** `package.json`, `packages/nutrition-engine/**`, `apps/meal-service/prisma/schema.prisma`, `apps/meal-service/scripts/seed*.ts`, `apps/meal-service/data/reference/*.jsonl`, `src/lib/auth.ts`, `compose*.yaml`, `docs/DEPLOY.md`.
- **Depends:** —
- **Acceptance:** `docker compose up` → migrate + seed chạy, đăng nhập 4 role được; engine test xanh độc lập; homepage `/api/health` ok; **không** vá tay khi deploy.
- **Test:** engine unit tests (port `test:ration*`); seed idempotent (chạy 2 lần không lỗi).
- **KHÔNG sửa:** `web-m2-rap` (repo cũ). Không thêm role `CLINICIAN`.

## M1 — Lịch tuần + MealEvent/DietMeal (đọc) + màn "việc tiếp theo" theo role
- **Scope:** model `MealEvent`/`DietMeal` (đọc + tạo rỗng theo ngày×bữa×chế độ); lịch tuần dùng chung (scope theo role); điều hướng sau login → màn chủ từng role (khung, chưa đủ nghiệp vụ).
- **Files:** `src/lib/meal-events.ts`, `src/app/(app)/lich/**`, `src/app/(app)/page.tsx` (role router), components lịch.
- **Depends:** M0
- **Acceptance:** 4 role đăng nhập ra đúng màn chủ; lịch hiện tuần này/tuần sau (ADMIN mọi tuần); ô hiện trạng thái + chip chế độ; lọc Ăn thường/Sonde.
- **Test:** scope query (NURSE chỉ khoa mình); rollup status MealEvent.
- **KHÔNG sửa:** engine (chỉ dùng).

## M2 — NVDD lên thực đơn + đánh giá + duyệt→snapshot (§VII, §IX)
- **Scope:** màn lên thực đơn (chọn ngày/bữa/route/chế độ, tạo/lấy mẫu/copy, chỉnh món+gram); gọi engine `diet-evaluation` → `evaluationJson`; **Duyệt & chuyển sang báo ăn** đóng băng `menuSnapshotJson`; `MenuTemplate` (kho mẫu cá nhân).
- **Files:** `src/app/(app)/thuc-don/**`, `src/lib/menu.ts`, `src/lib/menu-template.ts`, component đánh giá (progressive disclosure).
- **Depends:** M1
- **Acceptance:** đánh giá hiện từng chỉ tiêu đạt/vượt/thiếu (bấm ▸ mới hiện actual/target); duyệt xong DietMeal `PLANNED` + snapshot bất biến; lưu/lấy/copy/xóa mẫu (xóa chỉ khi chưa dùng).
- **Test:** `diet-evaluation` (đạt/vượt/thiếu, thiếu dữ liệu→không đoán); snapshot không đổi khi sửa data nền sau đó.
- **KHÔNG sửa:** không nhập món trong module khác; không sửa engine ngoài diet-evaluation input.

## M3 — Điều dưỡng báo suất + note tách internal/patient (§X)
- **Scope:** màn báo suất theo khoa (auto, không chọn khoa); upsert `ServingReport`/`Line`; materialize `DietMeal.servingsPlanned` (Σ toàn viện); note `internal` vs `patientVisible` ở tầng data.
- **Files:** `src/app/(app)/bao-suat/**`, `src/lib/serving-report.ts`.
- **Depends:** M1 (M2 để có thực đơn xem, không bắt buộc chặn)
- **Acceptance:** NURSE chỉ báo khoa mình; số gộp đúng theo chế độ; sửa trước chốt ghi audit; 2 loại note lưu tách.
- **Test:** cộng gộp đa khoa; quyền scope; audit before/after.
- **KHÔNG sửa:** không cho NURSE sửa thực đơn.

## M4 — Bếp: đi chợ + lifecycle trạng thái + bằng chứng (§XII, §VI)
- **Scope:** màn "bữa tiếp theo"; xuất dự kiến (engine `shopping`, thiếu→"—"); nút trạng thái `PREPARING→PREPARED→SERVED`; upload `MealEvidence` (ảnh bữa/mẫu/nhập kho/bill).
- **Files:** `src/app/(app)/bep/**`, `src/lib/kitchen.ts`, `src/lib/evidence-storage.ts`.
- **Depends:** M2, M3
- **Acceptance:** đi chợ = menu×suất đúng, thiếu liên kết→"—" + cảnh báo; đổi state ghi audit; ảnh hiển thị (thiếu storage→nằm im, không lỗi); bệnh nhân sẽ xem ảnh này (M6).
- **Test:** `shopping` (Cá 600g→750g theo %thải bỏ; Muối thiếu→"—"); state machine hợp lệ.
- **KHÔNG sửa:** ảnh không được biến thành state.

## M5 — Suất bổ sung sau chốt + bếp ack (§XI)
- **Scope:** giờ chốt chuẩn → `LOCKED` (số gốc khóa); `LateMealAddition` (lý do bắt buộc, không sửa số gốc); bếp ack (Đã nhận/Không đủ/Cần thay thế); `URGENT_POST_SERVE` sau khi SERVED.
- **Files:** `src/lib/late-addition.ts`, mở rộng màn bếp + báo suất.
- **Depends:** M3, M4
- **Acceptance:** sau chốt không sửa được số gốc; bổ sung cộng riêng (20+1=21 giữ cho báo cáo); bếp thấy cảnh báo + ack; không reopen lịch sử SERVED.
- **Test:** khóa sau chốt; tổng chốt + bổ sung; ack states.
- **KHÔNG sửa:** không tái dùng change-request kiểu sửa số.

## M6 — Trang bệnh nhân (QR) + ghi chú có duyệt (§III, §X)
- **Scope:** `/k/[token]` mobile (bữa gần nhất + ảnh + bữa tiếp + mức chỉ tiêu + note cho phép); gửi `PatientNote`; điều dưỡng duyệt → bếp thấy; login công khai `/` kèm màn bệnh nhân.
- **Files:** `src/app/k/[token]/**`, `src/app/page.tsx`, `src/lib/patient-note.ts`.
- **Depends:** M4
- **Acceptance:** không đăng nhập vẫn xem được khoa; note vào hàng chờ→duyệt→bếp thấy; chỉ hiện `patientVisibleNote`; mobile chữ to 1 việc/màn.
- **Test:** lọc chỉ APPROVED tới bếp; không lộ internalNote; rate-limit/ipHash chống spam.
- **KHÔNG sửa:** không thêm PII bắt buộc; không để note đụng số suất.

## M7 — Kho (§XIII-XIV)
- **Scope:** `Warehouse` (Mode A/B theo `AppSetting`); `InventoryTransaction` IN/OUT/ADJUST + `Line` + `Document`; nhập nhanh (lưu ngay, sửa sau); **dự kiến vs thực xuất** (chênh lệch); (tùy chọn) AI đọc bill pre-fill.
- **Files:** `src/app/(app)/kho/**`, `src/lib/warehouse.ts`.
- **Depends:** M4
- **Acceptance:** nhập/xuất/điều chỉnh + chứng từ; Mode B tách bếp/sonde; chênh lệch tính đúng; AI chỉ pre-fill (tắt vẫn dùng được); không hard-delete (chỉ hủy/điều chỉnh).
- **Test:** chênh lệch = thực xuất − dự kiến; phân kho theo route; audit.
- **KHÔNG sửa:** không làm AI thành bắt buộc; không tồn kho lô/hạn (ngoài scope).

## M8 — Báo cáo (một trình) + Audit log surfacing (§XVI, §XVII)
- **Scope:** 1 trình báo cáo (Từ ngày→Đến ngày→Chọn nội dung→Xuất Excel/PDF/in); màn xem `AuditLog` cho ADMIN.
- **Files:** `src/app/(app)/bao-cao/**`, `src/app/(app)/quan-tri/audit/**`, `src/lib/reports.ts`.
- **Depends:** M3–M7
- **Acceptance:** không có "hàng chục nút export"; chọn nội dung → xuất; audit xem được ai/gì/lúc nào/trước/sau.
- **Test:** nội dung xuất khớp DB; scope khoa cho NURSE.
- **KHÔNG sửa:** —

## M9 — Admin cấu hình + sonde toggle + hoàn thiện IA (§XV, §IV)
- **Scope:** `AppSetting` UI (số ngày nhập trước, giờ chốt/ăn, bật/tắt sonde, Mode kho, role duyệt kho); nhân sự & tài khoản; mã chế độ/quy định; nối tất cả thành **một khối** điều hướng.
- **Files:** `src/app/(app)/quan-tri/**`, `src/lib/settings.ts`.
- **Depends:** M1–M8
- **Acceptance:** đổi cấu hình có hiệu lực (giờ chốt, sonde ẩn/hiện, Mode kho); IA mọi role liền mạch; demo công khai hoàn chỉnh.
- **Test:** setting tác động hành vi (chốt, filter sonde); audit cấu hình.
- **KHÔNG sửa:** —

---

## Thứ tự & phụ thuộc
```
M0 → M1 → M2 ─┐
          └ M3 ─┬→ M4 → M5
                │      └→ M6
                └────────→ M7 → M8 → M9
```
- **Vòng lặp lõi có thể demo sớm:** sau **M4** (lịch → thực đơn → báo suất → bếp → bằng chứng).
- Kho (M7) có thể làm song song sau M4 nếu cần, nhưng vẫn 1 agent/1 vùng.

## Nhắc governance (bài học cũ)
- Quyết định nằm ở tài liệu này = **nguồn sự thật cho Codex** (Codex không đọc được memory/chat của Claude). Khi giao milestone, **trỏ Codex vào đúng file** trong `docs/bao-an-redesign/`.
- Màn nhân viên chụp nghiệm thu **desktop ~1280px**, chỉ bệnh nhân chụp **mobile**.
- Nghiệm thu chạy trên Postgres thật (Codex môi trường có Docker), nộp log + ảnh vào PR → Claude rà bằng chứng → mới merge.
