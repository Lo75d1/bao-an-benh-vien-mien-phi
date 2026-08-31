# Suất ăn bệnh viện

Hệ thống mã nguồn mở hỗ trợ bệnh viện quản lý một luồng thống nhất: dinh dưỡng lên thực đơn, khoa báo suất, bếp chuẩn bị và lưu bằng chứng, giao nhận, kho và báo cáo.

## Huong dan nhanh

- [Huong dan su dung](docs/HUONG-DAN-SU-DUNG.md)
- [Huong dan trien khai](docs/DEPLOY.md)
- Trang cong khai ho tro Phan anh / Ghi chu Bep va tieng Viet / English.


## Chức năng chính

- Thực đơn nhiều mã chế độ ăn, nhập Excel, phân tích dinh dưỡng và tự khóa theo giờ.
- Báo suất theo khoa, báo bổ sung độc lập cho ăn thường và Sonde.
- Màn bếp theo thời gian thực, bảng đi chợ, ghi chú và ảnh bằng chứng.
- Điều hành, lịch tuần, kho hóa đơn, báo cáo PDF/Excel và AuditLog.
- Trang công khai để người bệnh xem thực đơn theo mã chế độ ăn.
- Bốn vai trò: Quản trị, Dinh dưỡng, Điều dưỡng và Bếp.

## Công nghệ và cấu trúc

- Next.js, TypeScript, Prisma và PostgreSQL.
- `apps/meal-service/`: ứng dụng web và schema nghiệp vụ.
- `packages/nutrition-engine/`: bộ tính dinh dưỡng dùng chung.
- `data/reference/`: dữ liệu tham chiếu; nguồn được ghi tại [data/reference/SOURCES.md](data/reference/SOURCES.md).
- `docs/bao-an-redesign/`: đặc tả giao diện và nghiệp vụ đã dùng khi xây dựng.

## Chạy bằng Docker Compose

```bash
cp .env.example .env
sh scripts/compose-env.sh up -d --build
```

Trước khi chạy, thay toàn bộ giá trị mẫu trong `.env`, đặc biệt là mật khẩu PostgreSQL, mật khẩu quản trị đầu tiên và hai salt. `DATABASE_URL` dùng hostname `db` khi chạy trong Compose.

Kiểm tra sau khi khởi động:

```bash
curl http://localhost:3000/api/health
```

Tài khoản quản trị đầu tiên lấy từ `BOOTSTRAP_ADMIN_*` và bắt buộc đổi mật khẩu khi đăng nhập lần đầu. Hướng dẫn vận hành chi tiết ở [docs/DEPLOY.md](docs/DEPLOY.md).

## Phát triển và kiểm tra

```bash
npm ci
npm run db:generate -w @suat-an/meal-service
npm run typecheck -w @suat-an/meal-service
npm run lint -w @suat-an/meal-service
npm test -w @suat-an/meal-service
npm run build -w @suat-an/meal-service
```

Không dùng `prisma migrate reset` hoặc `prisma db push --accept-data-loss` trên dữ liệu thật. Không commit `.env`, database dump, khóa riêng hay thông tin người bệnh.

## Bảo mật

- Phiên đăng nhập dùng cookie `HttpOnly`; tài khoản mới/reset mật khẩu phải đổi mật khẩu lần đầu.
- Thử đăng nhập sai bị giới hạn bằng bộ đếm PostgreSQL đã băm HMAC.
- Ghi chú công khai được giới hạn tần suất; ảnh công khai chỉ phục vụ ảnh bữa ăn hợp lệ.
- Secret scan chạy trong CI. Khi phát hiện secret, phải thu hồi/đổi khóa trước khi xóa khỏi lịch sử Git.

## Giấy phép và liên hệ

Phát hành theo giấy phép [MIT](LICENSE). Bản quyền © 2026 Lê Công Bảo Long.

Hỗ trợ dự án: Zalo `0986703396`.
