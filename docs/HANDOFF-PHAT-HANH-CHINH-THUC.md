# Bàn giao: chuẩn bị bản phát hành chính thức

Ngày lưu trạng thái: 24/08/2026.

## Trạng thái hiện tại

- Repo: `Lo75d1/bao-an-benh-vien-mien-phi`.
- Nhánh đang làm: `demo`, đang đồng bộ với `origin/demo`.
- Commit demo gần nhất: `0fc858c`.
- `main` chưa được cập nhật bằng đợt thay đổi này.
- Bản demo hiện đã có luồng suất ăn thường và Sonde độc lập; Sonde dùng các cữ riêng, có thể cấu hình 7–8 cữ/ngày.
- Kiểm tra gần nhất đã xanh: build, typecheck, lint và test.

## Quyết định đã chốt với chủ dự án

Chuẩn bị một bản sạch để công khai trên `main`, nhưng phải giữ nhánh `demo` cho thử nghiệm.

Bản chính thức sẽ:

1. Giữ đúng **một tài khoản quản trị khởi tạo** để đăng nhập và setup hệ thống.
2. Không hardcode tài khoản hoặc mật khẩu trong GitHub; thông tin khởi tạo lấy từ biến môi trường trên máy chủ.
3. Yêu cầu đổi mật khẩu sau lần đăng nhập đầu tiên, nếu hệ thống hiện có hỗ trợ/cần bổ sung luồng này.
4. Xóa tài khoản demo, bot tạo dữ liệu ngẫu nhiên và dữ liệu vận hành giả.
5. Không seed giả báo suất, báo cáo, hóa đơn, ảnh bằng chứng hoặc lịch sử vận hành.
6. Giữ dữ liệu nền thực phẩm–dinh dưỡng và cấu hình khởi đầu gồm 3 bữa thường + 8 cữ Sonde để quản trị viên chỉnh sửa.
7. Xóa chữ `demo` khỏi tên bệnh viện và giao diện bản chính thức.
8. Không xóa hay ghi đè nhánh `demo`.

## Việc cần làm tiếp theo

1. Tìm cơ chế bootstrap quản trị hiện có; ưu tiên tái sử dụng, không dựng hệ tài khoản song song.
2. Tạo nhánh `codex/chuan-bi-ban-chinh-thuc` từ `demo` để mang toàn bộ tính năng đã nghiệm thu sang bản sạch.
3. Rà `docker-compose.yml`, `scripts/seed-demo.ts`, `scripts/seed.ts`, package scripts, README/.env mẫu và UI branding.
4. Loại bot và dữ liệu demo; bổ sung bootstrap admin bằng biến môi trường nếu chưa có.
5. Không phá dữ liệu Food/Dish và không dùng `prisma migrate reset`.
6. Chạy `npm run build`, typecheck, lint và toàn bộ test.
7. Báo kết quả và **hỏi chủ dự án xác nhận lần cuối trước khi merge/push `main`**.

## Lưu ý quy trình

- Chủ dự án yêu cầu phải hỏi trước mọi thay đổi UI quan trọng.
- Quy trình đã được chủ dự án đổi thành Codex tự kiểm tra rồi PR/merge; không dùng Claude review.
- Khi phát hành VPS, cung cấp lệnh một dòng để tránh lỗi khi dán qua noVNC.
- Không đưa secret, `DATABASE_URL`, khóa SSH hay mật khẩu vào Git.

