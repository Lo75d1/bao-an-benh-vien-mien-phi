# Suất ăn bệnh viện – Hướng dẫn sử dụng

Tài liệu này tóm tắt cách sử dụng hệ thống Suất ăn bệnh viện cho bệnh viện triển khai thực tế. Nội dung tập trung vào nghiệp vụ đang có trong hệ thống, không mô tả theo mã nguồn.

## 1. Các vai trò trong hệ thống

Hệ thống có bốn vai trò chính:

- Quản trị: cấu hình hệ thống, tài khoản, khoa/phòng, mã chế độ ăn, kho, nhận diện bệnh viện và theo dõi nhật ký.
- Dinh dưỡng: thiết kế thực đơn, theo dõi báo suất, theo dõi vận hành, xử lý phản ánh/ghi chú và xem báo cáo.
- Điều dưỡng: báo suất theo khoa, gửi báo bổ sung, theo dõi giao nhận và xác nhận nhận suất khi workflow yêu cầu.
- Bếp: xem số lượng cần chuẩn bị, chuẩn bị suất, lưu bằng chứng, bàn giao và xem ghi chú Bếp đã được chuyển.

Không có vai trò bệnh nhân/người nhà. Người bệnh hoặc người nhà sử dụng trang công khai, không cần đăng nhập.

## 2. Điều dưỡng

Điều dưỡng sử dụng hệ thống để báo số lượng suất ăn cho khoa theo từng bữa và từng mã chế độ ăn.

Các thao tác chính:

- Chọn bữa cần báo suất theo thời gian vận hành.
- Nhập số suất cho từng mã chế độ ăn.
- Phân biệt luồng NORMAL và SONDE khi bệnh viện bật Sonde.
- Gửi báo bổ sung khi phát sinh sau giờ chốt.
- Theo dõi trạng thái bữa ăn và trạng thái giao nhận.
- Xác nhận nhận suất theo workflow khi Bếp đã bàn giao.

Điều dưỡng chỉ thao tác trong phạm vi khoa được phân công.

## 3. Dinh dưỡng

Bộ phận Dinh dưỡng dùng hệ thống như trung tâm điều phối chuyên môn và vận hành suất ăn.

Các thao tác chính:

- Thiết kế và quản lý thực đơn theo ngày, bữa và mã chế độ ăn.
- Theo dõi báo suất từ các khoa.
- Theo dõi trạng thái vận hành theo thời gian thực.
- Xem và xử lý Phản ánh / Ghi chú Bếp.
- Chuyển Ghi chú Bếp cho Bếp khi nội dung phù hợp.
- Xem báo cáo phục vụ đối chiếu và quản lý.

Dinh dưỡng không dùng phản ánh công khai để tự ý thay đổi y lệnh hoặc chế độ ăn của người bệnh.

## 4. Bếp

Bếp sử dụng hệ thống để tiếp nhận nhu cầu đã được tổng hợp và thực hiện chuẩn bị suất ăn.

Các thao tác chính:

- Xem số lượng cần chuẩn bị theo từng mã chế độ ăn.
- Phân biệt NORMAL và SONDE theo phạm vi tài khoản bếp.
- Theo dõi suất báo ban đầu, suất bổ sung và tổng cần chuẩn bị.
- Lưu ảnh món ăn hoặc bằng chứng liên quan.
- Xác nhận bữa đã chuẩn bị.
- Bàn giao suất cho khoa.
- Xem Ghi chú Bếp chỉ sau khi nội dung đã được Điều dưỡng/Admin/Dinh dưỡng chuyển.

Phản ánh thông thường không hiển thị trực tiếp cho Bếp.

## 5. Kho và upload hóa đơn

Khu vực Kho hỗ trợ lưu hóa đơn/chứng từ để tra cứu lại.

Upload hóa đơn hỗ trợ:

- JPG
- PNG
- WEBP
- PDF
- Dung lượng tối đa 10 MB

Nếu chọn sai định dạng hoặc tệp vượt quá 10 MB, hệ thống báo lỗi ngay trong modal. Nếu backend hoặc nơi lưu trữ tệp gặp lỗi, hệ thống hiển thị lỗi có kiểm soát trong modal và không làm sập trang Kho.

Lưu hóa đơn chỉ lưu chứng từ, không tự cộng hoặc trừ tồn kho.

## 6. Phản ánh / Ghi chú Bếp trên trang công khai

Trên trang công khai có một nút/khu vực:

**Phản ánh / Ghi chú Bếp**

Mặc định hệ thống chọn **Phản ánh**, vì đây là nhu cầu thường gặp hơn.

### FEEDBACK – Phản ánh

Dùng cho các nội dung như:

- Suất ăn giao trễ.
- Thiếu suất.
- Món ăn có vấn đề.
- Cần hỗ trợ.
- Góp ý chất lượng.
- Vấn đề phục vụ.

Phản ánh do Admin/Dinh dưỡng xử lý. Phản ánh không chuyển trực tiếp cho Bếp.

### KITCHEN_NOTE – Ghi chú Bếp

Dùng cho nội dung liên quan trực tiếp đến việc chuẩn bị suất ăn, ví dụ:

- Lưu ý chế biến.
- Lưu ý khi chuẩn bị suất.
- Yêu cầu liên quan trực tiếp đến Bếp.

Ghi chú Bếp không phải kênh thay đổi y lệnh hoặc chế độ ăn. Người bệnh/người nhà không thể tự sửa chế độ ăn đã được nhân viên chuyên môn thiết lập.

Ghi chú Bếp chỉ hiển thị cho Bếp sau khi nhân viên có quyền kiểm tra và chuyển nội dung sang Bếp.

Người bệnh/người nhà không cần đăng nhập để gửi Phản ánh hoặc Ghi chú Bếp.

## 7. Trang Phản ánh & Ghi chú Bếp

Admin và Dinh dưỡng có thể mở trang:

`/phan-anh`

Tại đây có thể:

- Xem nội dung mới.
- Phân biệt Phản ánh và Ghi chú Bếp.
- Lọc theo loại nội dung và trạng thái.
- Đánh dấu phản ánh đã xử lý.
- Từ chối nội dung không phù hợp.
- Chuyển Ghi chú Bếp cho Bếp khi phù hợp.

Các thao tác xử lý được ghi nhận vào nhật ký hệ thống.

## 8. Ngôn ngữ

Người dùng nội bộ có thể đổi ngôn ngữ tại:

**Hồ sơ tài khoản → Ngôn ngữ / Language**

Hệ thống hỗ trợ:

- Tiếng Việt
- English

Lựa chọn ngôn ngữ được lưu theo tài khoản. Sau khi refresh, đăng xuất hoặc đăng nhập lại, hệ thống vẫn đọc lại lựa chọn đã lưu. Tài khoản cũ mặc định là Tiếng Việt.

## 9. Trang công khai

Trang công khai cho người bệnh/người nhà hỗ trợ:

- Xem thực đơn.
- Xem thông tin bữa hiện tại và bữa kế tiếp.
- Xem ảnh món ăn nếu bệnh viện bật hiển thị ảnh công khai.
- Gửi phản ánh.
- Gửi Ghi chú Bếp khi cần.

QR bệnh nhân khi triển khai thực tế phải trỏ về trang công khai chính thức của bệnh viện triển khai, hoặc public page riêng của khoa thuộc bệnh viện đó nếu được cấu hình. Không mặc định trỏ về domain của nhà phát triển.

## 10. Quy trình tổng quát

Quy trình vận hành cơ bản:

Điều dưỡng báo suất
→ Dinh dưỡng theo dõi/chốt
→ Bếp chuẩn bị
→ Bếp bàn giao
→ Khoa nhận/xác nhận

Luồng NORMAL và SONDE được giữ độc lập để tránh nhầm dữ liệu giữa ăn đường miệng và nuôi ăn qua Sonde.
