# Triển khai production bằng Docker Compose

## 1. Chuẩn bị cấu hình

```bash
cp .env.example .env
```

Đổi toàn bộ giá trị mẫu. `POSTGRES_PASSWORD` và mật khẩu nằm trong `DATABASE_URL` phải khớp; nếu mật khẩu có ký tự đặc biệt thì phải URL-encode trong `DATABASE_URL`. Không commit `.env`.

Tạo hai salt độc lập, tối thiểu 32 ký tự:

```bash
openssl rand -base64 32
```

Gán lần lượt cho `PATIENT_NOTE_IP_SALT` và `AUTH_RATE_LIMIT_SALT`.

## 2. Build và khởi động

```bash
sh scripts/compose-env.sh up -d --build
```

Luon chay Compose qua `scripts/compose-env.sh`. Script nay loai bo cac bien cau
hinh cu da `export` trong terminal, vi Docker Compose uu tien bien cua shell hon
file `.env`; neu chay `docker compose` truc tiep, tai khoan bootstrap co the khac
voi gia tri dang ghi trong `.env`.

Compose chờ PostgreSQL khỏe, chạy migration, tạo tài khoản quản trị đầu tiên nếu chưa có rồi mới chạy ứng dụng. Seed có tính lặp lại an toàn và không in mật khẩu ra log.

## 3. Kiểm tra

```bash
sh scripts/compose-env.sh ps
curl http://localhost:3000/api/health
sh scripts/compose-env.sh logs --tail=100 app migrate seed
```

Kết quả health mong đợi: `{"status":"ok"}`. Đăng nhập bằng `BOOTSTRAP_ADMIN_EMAIL`, đổi mật khẩu tạm ngay lần đầu, rồi cấu hình bệnh viện trong phần Quản trị.

## 4. Cập nhật

```bash
git fetch origin && git checkout main && git pull --ff-only origin main && sh scripts/compose-env.sh up -d --build --force-recreate
```

Không dùng `git reset --hard` hoặc reset database. Migration chỉ chạy tiến; sao lưu PostgreSQL và volume ảnh trước lần cập nhật quan trọng.

## 5. Reverse proxy

Proxy HTTPS phải ghi đè `X-Real-IP` bằng IP kết nối thật và không giữ giá trị do client tự gửi. Ứng dụng dùng header này cho giới hạn ghi chú và đăng nhập. Không công khai trực tiếp cổng PostgreSQL.
