import assert from "node:assert/strict";
import test from "node:test";
import { detectImportColumns, parseImportRows } from "../src/lib/menu-excel-import";

test("nhận diện cột Excel tiếng Việt và giữ dinh dưỡng thiếu là null", () => {
  const mapping = detectImportColumns(["Bữa ăn", "Mã chế độ ăn", "Kiểu món", "Tên thực phẩm", "Gram sạch/suất", "Kcal", "Đạm"]);
  assert.deepEqual(mapping, { dietCode: 1, mealName: 0, dishName: 2, foodName: 3, grams: 4, energyKcal: 5, proteinG: 6 });
  const [row] = parseImportRows([["Trưa", "CƠM_THƯỜNG", "Món mặn", "Thịt heo", 80, 242, 27]], mapping);
  assert.equal(row.dietCode, "CƠM_THƯỜNG");
  assert.equal(row.nutrients.energyKcal, 242);
  assert.equal(row.nutrients.lipidG, null);
  assert.deepEqual(row.warnings, []);
});

test("cảnh báo trước khi nhập hàng thiếu mã hoặc khối lượng", () => {
  const mapping = detectImportColumns(["Tên thực phẩm", "Gram"]);
  const [row] = parseImportRows([["Gạo tẻ", "không rõ"]], mapping);
  assert.deepEqual(row.warnings, ["Chưa chọn mã chế độ ăn", "Khối lượng phải lớn hơn 0"]);
});
