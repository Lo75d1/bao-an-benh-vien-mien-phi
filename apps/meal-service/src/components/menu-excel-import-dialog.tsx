"use client";

import { useMemo, useRef, useState } from "react";
import { Download, FileSpreadsheet, Sparkles, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { detectImportColumns, parseImportRows, requiredImportFields, type ImportColumnMap, type ImportField, type ImportPreviewRow } from "@/lib/menu-excel-import";
import type { MenuItemInput } from "@/lib/menu-logic";

type MealOption = { id: string; code: string; approved: boolean };
const fieldLabels: Array<[ImportField, string]> = [["dietCode", "Mã chế độ ăn"], ["mealName", "Bữa ăn"], ["dishName", "Kiểu / tên món"], ["foodName", "Tên thực phẩm"], ["grams", "Gram sạch/suất"], ["energyKcal", "Năng lượng (kcal)"], ["proteinG", "Đạm (g)"], ["lipidG", "Béo (g)"], ["glucidG", "Bột đường (g)"], ["sodiumMg", "Natri (mg)"], ["potassiumMg", "Kali (mg)"], ["waterG", "Nước (g)"]];

export function MenuExcelImportDialog({ meals, onApply }: { meals: MealOption[]; onApply: (rows: Array<{ mealId: string; item: MenuItemInput }>) => void }) {
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

  function rebuild(nextMapping: ImportColumnMap) { setMapping(nextMapping); setRows(parseImportRows(rawRows, nextMapping)); }
  async function downloadTemplate() {
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Nhap thuc don");
    sheet.addRow(["Bữa ăn", "Mã chế độ ăn", "Kiểu món", "Tên thực phẩm", "Gram sạch/suất", "Năng lượng kcal", "Đạm g", "Béo g", "Bột đường g", "Natri mg", "Kali mg", "Nước g"]);
    sheet.addRow(["Trưa", meals[0]?.code ?? "COM_THUONG", "Món mặn", "", "", "", "", "", "", "", "", ""]);
    sheet.getRow(1).font = { bold: true };
    sheet.columns.forEach((column, index) => { column.width = index === 3 ? 28 : 18; });
    const data = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([new Uint8Array(data)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const link = document.createElement("a"); link.href = url; link.download = "mau-nhap-thuc-don.xlsx"; link.click(); URL.revokeObjectURL(url);
  }
  async function readFile(file: File) {
    setBusy(true); setStatus("");
    try {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const sheet = workbook.worksheets[0];
      if (!sheet) throw new Error("empty");
      const values: unknown[][] = [];
      sheet.eachRow((row) => { const cells: unknown[] = []; row.eachCell({ includeEmpty: true }, (cell, columnNumber) => { const value = cell.value; cells[columnNumber - 1] = typeof value === "object" && value && "text" in value ? String(value.text) : value; }); values.push(cells); });
      const nextHeaders = (values[0] ?? []).map((value) => String(value ?? "").trim());
      const nextRows = values.slice(1);
      const nextMapping = detectImportColumns(nextHeaders);
      setHeaders(nextHeaders); setRawRows(nextRows); setMapping(nextMapping); setRows(parseImportRows(nextRows, nextMapping));
      setStatus(requiredImportFields.every((field) => nextMapping[field] !== undefined) ? "Đã nhận diện cột. Kiểm tra mã trước khi đưa vào thực đơn." : "Còn cột chưa nhận diện. Chọn cột bằng tay hoặc dùng AI hỗ trợ.");
    } catch { setStatus("Không đọc được tệp .xlsx này."); }
    finally { setBusy(false); }
  }
  async function analyzeWithAi() {
    setBusy(true); setStatus("AI đang nhận diện tên cột…");
    try {
      const response = await fetch("/api/menu-import/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ headers, samples: rawRows.slice(0, 3), externalProcessingConsent: consent }) });
      const data = await response.json() as { mapping?: ImportColumnMap; error?: string };
      if (!response.ok || !data.mapping) throw new Error(data.error || "AI chưa phân tích được.");
      rebuild({ ...mapping, ...data.mapping }); setStatus("AI đã ghép cột. Hãy kiểm tra lại trước khi nhập.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "AI chưa phân tích được."); }
    finally { setBusy(false); }
  }
  function patchRow(index: number, patch: Partial<ImportPreviewRow>) { setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row)); }
  const validRows = rows.flatMap((row) => { const meal = mealByCode.get(row.dietCode.toLocaleLowerCase("vi")); if (!meal || meal.approved || !row.foodName || row.grams === null || row.grams <= 0) return []; return [{ mealId: meal.id, item: { foodId: null, itemName: row.foodName, dishName: row.dishName || "Món 1", grams: row.grams, wastePercent: null, nutrients: row.nutrients } satisfies MenuItemInput }]; });

  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><button type="button"><FileSpreadsheet/>Nhập Excel</button></DialogTrigger><DialogContent className="nutrition-import-dialog max-h-[92vh] max-w-6xl overflow-hidden"><DialogHeader><DialogTitle>Nhập thực đơn từ Excel</DialogTitle><DialogDescription>Đọc từng hàng thực phẩm, kiểm tra các chất dinh dưỡng và chọn đúng mã trước khi nhập. Dữ liệu hiện tại chưa bị thay đổi.</DialogDescription></DialogHeader>
    {!headers.length ? <div className="nutrition-import-start"><button type="button" className="nutrition-import-drop" onClick={() => inputRef.current?.click()}><Upload/><strong>Chọn tệp Excel</strong><span>.xlsx hoặc .xlsm · hàng đầu là tiêu đề · mỗi thực phẩm là một hàng</span></button><button type="button" className="nutrition-import-template" onClick={downloadTemplate}><Download/> Tải file mẫu đúng các trường</button></div> : <div className="nutrition-import-body">
      <section className="nutrition-import-mapping"><strong>Ghép trường</strong>{fieldLabels.map(([field, label]) => <label key={field}>{label}<select value={mapping[field] ?? ""} onChange={(event) => rebuild({ ...mapping, [field]: event.target.value === "" ? undefined : Number(event.target.value) })}><option value="">— Chưa có —</option>{headers.map((header, index) => <option key={`${header}-${index}`} value={index}>{header || `Cột ${index + 1}`}</option>)}</select></label>)}<label className="nutrition-ai-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)}/>Cho phép gửi tên cột và 3 dòng mẫu đến Gemini để nhận diện. Không gửi cả tệp.</label><button type="button" disabled={!consent || busy} onClick={analyzeWithAi}><Sparkles/>AI hỗ trợ ghép cột</button></section>
      <section className="nutrition-import-preview"><header><strong>Xem trước · {rows.length} hàng</strong><span>{status}</span></header><div><table><thead><tr><th>Dòng</th><th>Mã chế độ ăn</th><th>Bữa</th><th>Kiểu / món</th><th>Thực phẩm</th><th>g/suất</th><th>kcal</th><th>Đạm</th><th>Béo</th><th>Bột đường</th><th>Trạng thái</th></tr></thead><tbody>{rows.map((row, index) => { const meal = mealByCode.get(row.dietCode.toLocaleLowerCase("vi")); const warning = !meal ? "Chọn đúng mã" : meal.approved ? "Mã đã duyệt" : row.warnings.filter((item) => item !== "Chưa chọn mã chế độ ăn").join(" · "); return <tr key={row.rowNumber} className={warning ? "has-warning" : ""}><td>{row.rowNumber}</td><td><select value={meal?.code ?? ""} onChange={(event) => patchRow(index, { dietCode: event.target.value })}><option value="">— Chọn mã —</option>{meals.map((option) => <option key={option.id} value={option.code} disabled={option.approved}>{option.code}{option.approved ? " · đã duyệt" : ""}</option>)}</select></td><td>{row.mealName || "—"}</td><td><input value={row.dishName} onChange={(event) => patchRow(index, { dishName: event.target.value })}/></td><td><input value={row.foodName} onChange={(event) => patchRow(index, { foodName: event.target.value })}/></td><td><input type="number" min="0.1" step="0.1" value={row.grams ?? ""} onChange={(event) => patchRow(index, { grams: event.target.value ? Number(event.target.value) : null })}/></td><td>{row.nutrients.energyKcal ?? "—"}</td><td>{row.nutrients.proteinG ?? "—"}</td><td>{row.nutrients.lipidG ?? "—"}</td><td>{row.nutrients.glucidG ?? "—"}</td><td>{warning || "Sẵn sàng"}</td></tr>; })}</tbody></table></div></section>
    </div>}
    <input ref={inputRef} className="sr-only" type="file" accept=".xlsx,.xlsm" onChange={(event) => { const file = event.target.files?.[0]; if (file) void readFile(file); event.target.value = ""; }}/>{status && !headers.length ? <p role="status">{status}</p> : null}<DialogFooter><button type="button" onClick={() => inputRef.current?.click()} disabled={busy}>{headers.length ? "Chọn tệp khác" : "Chọn tệp"}</button><button type="button" className="primary-action" disabled={!validRows.length || busy} onClick={() => { onApply(validRows); setOpen(false); setStatus(`Đã đưa ${validRows.length} hàng vào bản nháp.`); }}>Đưa {validRows.length || "—"} hàng vào thực đơn</button></DialogFooter>
  </DialogContent></Dialog>;
}
