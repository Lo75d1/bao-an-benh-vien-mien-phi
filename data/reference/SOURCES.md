# Nguồn dữ liệu nền (data/reference)

Dữ liệu nền để seed DB. Đây là repo **công khai** → phần data này công khai kèm **ghi nguồn**.

## Nguồn
- **Thực phẩm & món ăn:** Viện Dinh dưỡng Việt Nam (VDD) + RNI. Đã dọn trùng, chuẩn hóa nhóm/loại,
  liên kết nguyên liệu (xem lịch sử xử lý ở `../web-m2-rap/README-data.md` của repo web dinh dưỡng).
- **Mã chế độ ăn / khuyến nghị / tăng trưởng:** tài liệu VDD + WHO (bản khuyến nghị cập nhật 2026).

## Tình trạng file (tính đến khi tạo repo)
| File | Dòng | Trạng thái |
|---|---|---|
| `foods.jsonl` | 3.719 | ✅ đủ |
| `dishes.jsonl` | 7.369 | ✅ đủ |
| `dish_ingredients.jsonl` | 41.457 | ✅ đủ |
| `diet_codes.jsonl` | 0 | ⛔ **THIẾU — cần bù** |
| `nutrition_recommendations.jsonl` | 0 | ⛔ **THIẾU — cần bù** |
| `child_growth_standards.jsonl` | 0 | ⛔ **THIẾU — cần bù** |
| `food_aliases.jsonl` | 0 | (tùy chọn) |

## ⚠️ DATA-TODO trước khi seed thật (blocker đã biết)
`diet_codes` (246), `nutrition_recommendations` (72), `child_growth_standards` (40) **KHÔNG có trong
JSON offline** (offline chỉ có foods/dishes/medications) và **bản sạch/cập nhật nằm trong DB production**
của web dinh dưỡng (Supabase). xlsx gốc là **bản CŨ** (khuyến nghị đã sửa theo tài liệu 2026 trong DB).

**Cách bù đúng (chọn 1):**
1. **Xuất từ DB production** (sạch nhất): dùng script export → 3 file jsonl. *Cần chủ dự án cấp
   `DATABASE_URL` read-only.* (Claude viết script, chạy khi có kết nối.)
2. Nếu chấp nhận bản cũ: trích lại từ xlsx nguồn (VDD/WHO) — lưu ý **có thể lệch** bản đã cập nhật.

**Cho tới khi bù:** engine đánh giá mã chế độ sẽ thiếu ngưỡng → phải hiện "—"/cảnh báo, **không đoán**.

## Ghi chú kỹ thuật
- `manifest.json` mô tả từng file (model Prisma tương ứng + số dòng kỳ vọng).
- Seed idempotent: đã có data thì bỏ qua (không nhân đôi).
