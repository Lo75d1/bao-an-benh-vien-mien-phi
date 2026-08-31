"use client";

import { useMemo, useRef, useState } from "react";
import { Download, FileSpreadsheet, Sparkles, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { detectImportColumns, parseImportRows, requiredImportFields, type ImportColumnMap, type ImportField, type ImportPreviewRow } from "@/lib/menu-excel-import";
import type { MenuItemInput } from "@/lib/menu-logic";
import type { Language } from "@/lib/i18n";

type MealOption = { id: string; code: string; approved: boolean };
const fieldLabels: Array<[ImportField, string]> = [
  ["dietCode", "Mã chế độ ăn"],
  ["mealName", "Bữa ăn"],
  ["dishName", "Tên món ăn"],
  ["foodName", "Tên thực phẩm"],
  ["grams", "Gram sạch/suất"],
  ["energyKcal", "Năng lượng (kcal)"],
  ["proteinG", "Đạm (g)"],
  ["lipidG", "Béo (g)"],
  ["glucidG", "Bột đường (g)"],
  ["sodiumMg", "Natri (mg)"],
  ["potassiumMg", "Kali (mg)"],
  ["waterG", "Nước (g)"],
];

export function MenuExcelImportDialog({ meals, mealName, onApply, language = "vi" }: { meals: MealOption[]; mealName: string; onApply: (rows: Array<{ mealId: string; item: MenuItemInput }>) => void; language?: Language }) {
  const en = language === "en";
  const fieldLabel = (field: ImportField, fallback: string) => en ? ({ dietCode: "Diet code", mealName: "Meal", dishName: "Dish name", foodName: "Food name", grams: "Edible g/serving", energyKcal: "Energy (kcal)", proteinG: "Protein (g)", lipidG: "Fat (g)", glucidG: "Carbohydrate (g)", sodiumMg: "Sodium (mg)", potassiumMg: "Potassium (mg)", waterG: "Water (g)" } as Record<ImportField, string>)[field] : fallback;
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<unknown[][]>([]);
  const [mapping, setMapping] = useState<ImportColumnMap>({});
  const [rows, setRows] = useState<ImportPreviewRow[]>([]);
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const mealByCode = useMemo(() => new Map(meals.map((meal) => [meal.code.toLocaleLowerCase("vi"), meal])), [meals]);

  function rebuild(nextMapping: ImportColumnMap) {
    setMapping(nextMapping);
    setRows(parseImportRows(rawRows, nextMapping));
  }
  async function downloadTemplate() {
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Nhap thuc don");
    sheet.addRow(en ? ["Diet code", "Dish name", "Food name", "Edible g/serving", "Energy kcal", "Protein g", "Fat g", "Carbohydrate g", "Sodium mg", "Potassium mg", "Water g", "Meal"] : ["Mã chế độ ăn", "Tên món ăn", "Tên thực phẩm", "Gram sạch/suất", "Năng lượng kcal", "Đạm g", "Béo g", "Bột đường g", "Natri mg", "Kali mg", "Nước g", "Bữa ăn"]);
    sheet.addRow([meals[0]?.code ?? "COM_THUONG", en ? "Rice — main dish" : "Cơm — món chính", "", "", "", "", "", "", "", "", "", mealName]);
    sheet.getRow(1).font = { bold: true };
    sheet.columns.forEach((column, index) => {
      column.width = index === 3 ? 28 : 18;
    });
    const data = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(
      new Blob([new Uint8Array(data)], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "mau-nhap-thuc-don.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  }
  async function readFile(file: File) {
    setBusy(true);
    setStatus("");
    try {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const sheet = workbook.worksheets[0];
      if (!sheet) throw new Error("empty");
      const values: unknown[][] = [];
      sheet.eachRow((row) => {
        const cells: unknown[] = [];
        row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
          const value = cell.value;
          cells[columnNumber - 1] = typeof value === "object" && value && "text" in value ? String(value.text) : value;
        });
        values.push(cells);
      });
      const nextHeaders = (values[0] ?? []).map((value) => String(value ?? "").trim());
      const nextRows = values.slice(1);
      const nextMapping = detectImportColumns(nextHeaders);
      setHeaders(nextHeaders);
      setRawRows(nextRows);
      setMapping(nextMapping);
      setRows(parseImportRows(nextRows, nextMapping));
      setStatus(requiredImportFields.every((field) => nextMapping[field] !== undefined) ? (en ? "Columns identified. Check diet codes before adding rows to the menu." : "Đã nhận diện cột. Kiểm tra mã trước khi đưa vào thực đơn.") : (en ? "Some columns are not identified. Map them manually or use AI assistance." : "Còn cột chưa nhận diện. Chọn cột bằng tay hoặc dùng AI hỗ trợ."));
    } catch {
      setStatus(en ? "Unable to read this .xlsx file." : "Không đọc được tệp .xlsx này.");
    } finally {
      setBusy(false);
    }
  }
  async function analyzeWithAi() {
    setBusy(true);
    setStatus(en ? "AI is identifying column names…" : "AI đang nhận diện tên cột…");
    try {
      const response = await fetch("/api/menu-import/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          headers,
          samples: rawRows.slice(0, 3),
          externalProcessingConsent: consent,
        }),
      });
      const data = (await response.json()) as {
        mapping?: ImportColumnMap;
        error?: string;
      };
      if (!response.ok || !data.mapping) throw new Error(en ? "AI could not analyze the columns." : data.error || "AI chưa phân tích được.");
      rebuild({ ...mapping, ...data.mapping });
      setStatus(en ? "AI mapped the columns. Review them before importing." : "AI đã ghép cột. Hãy kiểm tra lại trước khi nhập.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : (en ? "AI could not analyze the columns." : "AI chưa phân tích được."));
    } finally {
      setBusy(false);
    }
  }
  function patchRow(index: number, patch: Partial<ImportPreviewRow>) {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }
  const validRows = rows.flatMap((row) => {
    const meal = mealByCode.get(row.dietCode.toLocaleLowerCase("vi"));
    if (!meal || meal.approved || !row.foodName || row.grams === null || row.grams <= 0) return [];
    return [
      {
        mealId: meal.id,
        item: {
          foodId: null,
          itemName: row.foodName,
          dishName: row.dishName || (en ? "Dish 1" : "Món 1"),
          grams: row.grams,
          wastePercent: null,
          nutrients: row.nutrients,
        } satisfies MenuItemInput,
      },
    ];
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button">
          <FileSpreadsheet />
          {en ? "Import Excel" : "Nhập Excel"}
        </button>
      </DialogTrigger>
      <DialogContent className="nutrition-import-dialog max-h-[92vh] max-w-6xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>{en ? "Import menu from Excel" : "Nhập thực đơn từ Excel"}</DialogTitle>
          <DialogDescription>{en ? "Read each food row, verify nutrients, and choose the correct diet code before import. Existing data is unchanged." : "Đọc từng hàng thực phẩm, kiểm tra các chất dinh dưỡng và chọn đúng mã trước khi nhập. Dữ liệu hiện tại chưa bị thay đổi."}</DialogDescription>
        </DialogHeader>
        {!headers.length ? (
          <div className="nutrition-import-start">
            <button type="button" className="nutrition-import-drop" onClick={() => inputRef.current?.click()}>
              <Upload />
              <strong>{en ? "Choose Excel file" : "Chọn tệp Excel"}</strong>
              <span>{en ? ".xlsx or .xlsm · first row contains headers · one food per row" : ".xlsx hoặc .xlsm · hàng đầu là tiêu đề · mỗi thực phẩm là một hàng"}</span>
            </button>
            <button type="button" className="nutrition-import-template" onClick={downloadTemplate}>
              <Download /> {en ? "Download field template" : "Tải file mẫu đúng các trường"}
            </button>
          </div>
        ) : (
          <div className="nutrition-import-body">
            <section className="nutrition-import-mapping">
              <strong>{en ? "Map fields" : "Ghép trường"}</strong>
              {fieldLabels.map(([field, label]) => (
                <label key={field}>
                  {fieldLabel(field, label)}
                  <select
                    value={mapping[field] ?? ""}
                    onChange={(event) =>
                      rebuild({
                        ...mapping,
                        [field]: event.target.value === "" ? undefined : Number(event.target.value),
                      })
                    }
                  >
                    <option value="">{en ? "— Not mapped —" : "— Chưa có —"}</option>
                    {headers.map((header, index) => (
                      <option key={`${header}-${index}`} value={index}>
                        {header || `${en ? "Column" : "Cột"} ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <label className="nutrition-ai-consent">
                <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
                {en ? "Allow column names and three sample rows to be sent to Gemini for identification. The full file is not sent." : "Cho phép gửi tên cột và 3 dòng mẫu đến Gemini để nhận diện. Không gửi cả tệp."}
              </label>
              <button type="button" disabled={!consent || busy} onClick={analyzeWithAi}>
                <Sparkles />
                {en ? "AI-assisted mapping" : "AI hỗ trợ ghép cột"}
              </button>
            </section>
            <section className="nutrition-import-preview">
              <header>
                <strong>{en ? "Preview" : "Xem trước"} · {rows.length} {en ? "rows" : "hàng"}</strong>
                <span>{status}</span>
              </header>
              <div>
                <table>
                  <thead>
                    <tr>
                      <th>{en ? "Row" : "Dòng"}</th>
                      <th>{en ? "Diet code" : "Mã chế độ ăn"}</th>
                      <th>{en ? "Meal" : "Bữa"}</th>
                      <th>{en ? "Dish name" : "Tên món ăn"}</th>
                      <th>{en ? "Food" : "Thực phẩm"}</th>
                      <th>g/{en ? "serving" : "suất"}</th>
                      <th>kcal</th>
                      <th>{en ? "Protein" : "Đạm"}</th>
                      <th>{en ? "Fat" : "Béo"}</th>
                      <th>{en ? "Carbohydrate" : "Bột đường"}</th>
                      <th>{en ? "Status" : "Trạng thái"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => {
                      const meal = mealByCode.get(row.dietCode.toLocaleLowerCase("vi"));
                      const warning = !meal ? (en ? "Choose a valid code" : "Chọn đúng mã") : meal.approved ? (en ? "Code is locked" : "Mã đã tự khóa") : row.warnings.filter((item) => item !== "Chưa chọn mã chế độ ăn").map((item) => en ? ({ "Thiếu tên thực phẩm": "Food name missing", "Gram không hợp lệ": "Invalid grams" } as Record<string, string>)[item] ?? item : item).join(" · ");
                      return (
                        <tr key={row.rowNumber} className={warning ? "has-warning" : ""}>
                          <td>{row.rowNumber}</td>
                          <td>
                            <select
                              value={meal?.code ?? ""}
                              onChange={(event) =>
                                patchRow(index, {
                                  dietCode: event.target.value,
                                })
                              }
                            >
                              <option value="">{en ? "— Choose code —" : "— Chọn mã —"}</option>
                              {meals.map((option) => (
                                <option key={option.id} value={option.code} disabled={option.approved}>
                                  {option.code}
                                  {option.approved ? (en ? " · locked" : " · đã tự khóa") : ""}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>{row.mealName || "—"}</td>
                          <td>
                            <input
                              value={row.dishName}
                              onChange={(event) =>
                                patchRow(index, {
                                  dishName: event.target.value,
                                })
                              }
                            />
                          </td>
                          <td>
                            <input
                              value={row.foodName}
                              onChange={(event) =>
                                patchRow(index, {
                                  foodName: event.target.value,
                                })
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0.1"
                              step="0.1"
                              value={row.grams ?? ""}
                              onChange={(event) =>
                                patchRow(index, {
                                  grams: event.target.value ? Number(event.target.value) : null,
                                })
                              }
                            />
                          </td>
                          <td>{row.nutrients.energyKcal ?? "—"}</td>
                          <td>{row.nutrients.proteinG ?? "—"}</td>
                          <td>{row.nutrients.lipidG ?? "—"}</td>
                          <td>{row.nutrients.glucidG ?? "—"}</td>
                          <td>{warning || (en ? "Ready" : "Sẵn sàng")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          accept=".xlsx,.xlsm"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void readFile(file);
            event.target.value = "";
          }}
        />
        {status && !headers.length ? <p role="status">{status}</p> : null}
        <DialogFooter>
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}>
            {headers.length ? (en ? "Choose another file" : "Chọn tệp khác") : (en ? "Choose file" : "Chọn tệp")}
          </button>
          <button
            type="button"
            className="primary-action"
            disabled={!validRows.length || busy}
            onClick={() => {
              onApply(validRows);
              setOpen(false);
              setStatus(en ? `Added ${validRows.length} rows to the draft.` : `Đã đưa ${validRows.length} hàng vào bản nháp.`);
            }}
          >
            {en ? "Add" : "Đưa"} {validRows.length || "—"} {en ? "rows to menu" : "hàng vào thực đơn"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
