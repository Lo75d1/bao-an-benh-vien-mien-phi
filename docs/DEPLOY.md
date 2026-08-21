# Chạy M0 bằng Docker Compose

Yêu cầu Docker Engine có Compose v2. Từ thư mục gốc repo:

```bash
docker compose up --build
```

Compose khởi động Postgres riêng, chạy migration `init`, seed dữ liệu nền rồi mới chạy app. Kiểm tra:

```bash
curl http://localhost:3000/api/health
```

Kết quả mong đợi: `{"status":"ok"}`. Seed có thể chạy lại an toàn bằng `docker compose run --rm seed`; các dòng đã có không bị nhân đôi. Tài khoản và mật khẩu demo được in trong log seed.

Không đưa URL/mật khẩu production vào repo. File `.env.example` chỉ là mẫu và mật khẩu Compose chỉ dùng cho mạng Docker cục bộ. Không dùng `prisma db push --accept-data-loss`.

Prisma CLI và engine được ghim cùng phiên bản trong lockfile và được cài trong image ở bước `npm ci`; quá trình build không gọi tải engine động ngoài bước cài dependency. Nếu môi trường build có lỗi mạng do MTU, cấu hình MTU Docker daemon/network thành `1400`, khởi động lại Docker rồi build lại; không vá tay image đang chạy.
