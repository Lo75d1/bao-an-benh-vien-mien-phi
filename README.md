# Suất Ăn Bệnh Viện (`suat-an-benh-vien`)

> Hệ thống số hóa quy trình cấp suất ăn bệnh viện — **mã nguồn mở**, để mọi người tham khảo cách làm.
> Monorepo: engine dinh dưỡng dùng chung + ứng dụng vận hành suất ăn. DB riêng, có bản demo công khai.

## Trạng thái
🚧 **Đang thiết kế → chuẩn bị triển khai (M0).** Bộ tài liệu thiết kế đầy đủ ở [`docs/bao-an-redesign/`](docs/bao-an-redesign/00-PROJECT-HOME.md).

## Là gì
Quy trình một ngày: **NVDD lên & duyệt thực đơn → điều dưỡng báo số suất theo khoa → hệ thống cộng theo mã chế độ → bếp nấu + chụp ảnh bằng chứng → bệnh nhân quét QR khoa để xem**. 4 vai: Admin/Trưởng khoa, NVDD (dinh dưỡng), Điều dưỡng, Bếp.

## Cấu trúc (dự kiến sau M0)
```
packages/nutrition-engine/   # thư viện tính dinh dưỡng + đánh giá mã chế độ (TS thuần)
apps/meal-service/           # ứng dụng Next.js (lịch, thực đơn, báo suất, bếp, kho, QR)
data/reference/              # data nền công khai (foods/dishes/…) — xem SOURCES.md
docs/bao-an-redesign/        # tài liệu thiết kế (nguồn sự thật)
```

## Bắt đầu đọc
👉 [docs/bao-an-redesign/00-PROJECT-HOME.md](docs/bao-an-redesign/00-PROJECT-HOME.md)

## Dữ liệu & nguồn
Data thực phẩm/món ăn từ **Viện Dinh dưỡng Việt Nam (VDD) + RNI**. Xem ghi nguồn ở [data/reference/SOURCES.md](data/reference/SOURCES.md).

## Giấy phép
⚠️ **TODO — chủ dự án chọn** (đề xuất: MIT hoặc Apache-2.0). Chưa chọn thì mặc định *bản quyền giữ toàn bộ* cho tới khi thêm `LICENSE`.

## Đóng góp / phát triển
Dự án dùng quy trình agent (Codex implement → review → merge). Xem [AGENTS.md](AGENTS.md).
