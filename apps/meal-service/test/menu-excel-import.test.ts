import assert from "node:assert/strict";
import test from "node:test";
import { detectImportColumns, parseImportRows } from "../src/lib/menu-excel-import";

test("nhận diện cột Excel tiếng Việt và giữ dinh dưỡng thiếu là null", () => {
  const mapping = detectImportColumns(["Mã chế độ ăn", "Tên món ăn", "Tên thực phẩm", "Gram sạch/suất", "Kcal", "Đạm", "Bữa ăn"]);
  assert.deepEqual(mapping, { dietCode: 0, dishName: 1, foodName: 2, grams: 3, energyKcal: 4, proteinG: 5, mealName: 6 });
  const [row] = parseImportRows([["CƠM_THƯỜNG", "Cơm — món chính", "Thịt heo", 80, 242, 27, "Trưa"]], mapping);
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
