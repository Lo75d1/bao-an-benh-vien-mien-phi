# AGENTS.md — Hiến chương cho agent (Codex đọc mỗi phiên)

> Repo: **`suat-an-benh-vien`** — hệ suất ăn bệnh viện, monorepo **công khai (mã nguồn mở)**.
> Đây là repo RIÊNG, tách khỏi web dinh dưỡng `dinhduong2598.food`.

## 0. ĐỌC TRƯỚC KHI LÀM BẤT CỨ VIỆC GÌ
1. **[docs/bao-an-redesign/00-PROJECT-HOME.md](docs/bao-an-redesign/00-PROJECT-HOME.md)** — bản đồ toàn dự án.
2. **[09-codex-milestones.md](docs/bao-an-redesign/09-codex-milestones.md)** — việc của bạn chia theo M0→M9 (làm ĐÚNG milestone được giao).
3. **[03-domain-model.md](docs/bao-an-redesign/03-domain-model.md)** + **[10-ui-ux-guidelines.md](docs/bao-an-redesign/10-ui-ux-guidelines.md)** — data model + chuẩn UI.
Tài liệu thiết kế trong `docs/bao-an-redesign/` là **NGUỒN SỰ THẬT**. Không tự chế nghiệp vụ/UX.

## 1. SETUP BẮT BUỘC TRƯỚC KHI CODE (bộ công cụ hỗ trợ Codex)

> Đảm bảo các công cụ dưới đây SẴN SÀNG trước mỗi phiên. Lệnh đã kiểm chứng trên máy điều phối (Windows, Node ≥ 22, Bun ≥ 1.1.35). Phân loại: **GLOBAL CODEX** (chung mọi repo) · **SHARED UI** (repo có UI) · **PROJECT ONLY**.

### 1.1 Taste Skill — chống UI "slop"  · SHARED UI
- **Mục đích:** hướng thiết kế UI (layout, typography, motion, spacing) cho MỌI màn UI.
- **Cài:** `npx skills add Leonxlnx/taste-skill` (mặc định v2 = `design-taste-frontend`; bản cũ: thêm `--skill design-taste-frontend-v1`).
- **Kiểm tra:** `npx skills list` thấy `design-taste-frontend`.
- **Khi dùng:** trước khi sinh bất kỳ màn UI nào; rồi bám thêm [`10-ui-ux-guidelines.md`](docs/bao-an-redesign/10-ui-ux-guidelines.md) (brand xanh rêu #123c36, teal #0f6e56).

### 1.2 repo-harness — workflow file-backed cho phiên Codex  · GLOBAL CODEX
- **Mục đích:** giữ ngữ cảnh/plan/verification/handoff qua FILE (không dựa trí nhớ chat); giảm chạy lan man; nối SessionStart→Stop.
- **Cài (chỉ Codex, KHÔNG đụng `~/.claude`):**
  ```bash
  npm i -g bun                                   # Bun runtime (repo-harness chạy trên Bun)
  bun add -g repo-harness@latest                 # CLI: repo-harness, repo-harness-hook
  bunx repo-harness@latest install --target codex --location global --no-codegraph
  ```
  Bảo đảm `bun` (bun.exe) + thư mục `~/.bun/bin` nằm trên PATH; hook cần một `bash` POSIX (trên Windows dùng **Git Bash**, KHÔNG phải WSL).
- **Kiểm tra:** `repo-harness --version`; tồn tại `~/.codex/hooks.json`; `repo-harness init --dry-run` in kế hoạch (không ghi).
- **Khi dùng:** tự động qua hook Codex (SessionStart/Stop/Pre-PostToolUse — hook tự no-op nếu thiếu binary, không phá phiên). `repo-harness init` (tạo file workflow trong repo) là quyết định RIÊNG, **chưa chạy ở M0**.
- **Giới hạn:** bước `agent-fleet`/sync-skill dùng script `.sh` → bỏ qua trên Windows không có WSL (không ảnh hưởng hook lõi).

### 1.3 CodeGraph — đồ thị cấu trúc codebase  · GLOBAL CODEX
- **Mục đích:** hiểu symbol/dependency/call-chain/phạm vi ảnh hưởng TRƯỚC khi sửa code (đỡ grep mò).
- **Cài:** tải binary release đúng OS từ `codegraph-ai/CodeGraph` (verify SHA256). Máy điều phối: `codegraph-server` v0.20.1.
- **Dùng — KHÔNG daemon, one-shot index thủ công:**
  ```bash
  codegraph-server --graph-only --workspace <repo> \
    --run-tool codegraph_pr_context --tool-args '{"baseBranch":"main","format":"markdown"}'
  ```
  `--graph-only` = bỏ embedding (không cần onnxruntime.dll, index nhanh 10–50×). **TUYỆT ĐỐI không dùng `--watch`** (daemon) trừ khi được duyệt.
- **Kiểm tra:** lệnh trên trả JSON + thoát 0; graph lưu ở `~/.codegraph/projects/<slug>/`.
- **Khi dùng:** cần phân tích phụ thuộc/ảnh hưởng; sau khi repo có code thật thì reindex để có đồ thị đầy đủ.

### 1.4 Security skills (phòng thủ, chọn lọc)  · GLOBAL CODEX
- **Mục đích:** rà soát bảo mật khi review — CHỈ phòng thủ, KHÔNG offensive/red-team. 21 skill đã đặt trong `~/.codex/skills`, theo 5 nhóm:
  - **Web/App:** broken-access-control · xss · cors · host-header-injection · security-headers-audit
  - **API:** owasp-api-top-10 · api-security-testing · BOLA · mass-assignment · schema-validation · rate-limiting · api-auth-weaknesses · BOPLA
  - **Supply chain/deps:** sboms · dependency-confusion · sca-snyk · secret-scanning-gitleaks
  - **DevSecOps/review:** dast-owasp-zap · cryptographic-audit · threat-modeling(owasp-threat-dragon) · hardening-docker-containers
- **Nguồn:** `mukul975/Anthropic-Cybersecurity-Skills` (Apache-2.0) — chỉ copy skill cần, KHÔNG cài cả kho 817.
- **Khi dùng:** review bảo mật PR trước merge; ưu tiên authz theo khoa, mass-assignment (Prisma), rate-limit trang QR công khai, secret trong git.

## 2. QUY TRÌNH (governance — KHÔNG được phá)
- **Hai nhánh triển khai cố định:** `demo` là nhánh tích hợp để chủ dự án xem trên VPS demo; `main` là bản Published ổn định. Mọi thay đổi mới đi `codex/<viec>` → `demo`. Chỉ gộp `demo` → `main` khi chủ dự án nói rõ **“đẩy bản published”**.
- Máy phát triển mặc định bám `demo`. VPS demo bám `origin/demo`; máy Published bám `origin/main`. Hai môi trường phải dùng database/secret riêng, không dùng dữ liệu demo chung với production.
- Làm trên **nhánh riêng** theo milestone → tự rà diff và phạm vi → chạy đầy đủ nghiệm thu → mở **PR / để lại diff** → Codex tự merge khi mọi kiểm tra đạt.
- **Codex chịu trách nhiệm cửa duyệt cuối:** kiểm tra trùng lặp, quyền truy cập, dữ liệu, secret, migration, test/build và bằng chứng UI trước khi merge.
- **Được tự merge vào `main` sau khi tự kiểm tra đạt. KHÔNG tự deploy. KHÔNG force-push.** Deploy production vẫn cần yêu cầu rõ ràng của chủ dự án.
- Mỗi milestone: chỉ đụng đúng phạm vi của nó; đọc mục "KHÔNG được sửa" của milestone đó.
- Một agent / một vùng — không ghi đè thay đổi đang làm dở của người khác.
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
