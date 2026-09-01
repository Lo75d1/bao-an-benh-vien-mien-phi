"use client";

import { useMemo, useRef, useState } from "react";
import { Download, FileSpreadsheet, Sparkles, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getTranslations, readClientLocale } from "@/lib/locale";
import { detectImportColumns, parseImportRows, requiredImportFields, type ImportColumnMap, type ImportField, type ImportPreviewRow } from "@/lib/menu-excel-import";
import type { MenuItemInput } from "@/lib/menu-logic";

type MealOption = { id: string; code: string; approved: boolean };

export function MenuExcelImportDialog({ meals, mealName, onApply }: { meals: MealOption[]; mealName: string; onApply: (rows: Array<{ mealId: string; item: MenuItemInput }>) => void }) {
  const t = getTranslations(readClientLocale()).management.thucDonPage;
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

  const fieldLabels: Array<[ImportField, string]> = [
    ["dietCode", t.excelImportColumnLabelDietCode],
    ["mealName", t.excelImportColumnLabelMealName],
    ["dishName", t.excelImportColumnLabelDishName],
    ["foodName", t.excelImportColumnLabelFoodName],
    ["grams", t.excelImportColumnLabelGrams],
    ["energyKcal", t.excelImportColumnLabelEnergy],
    ["proteinG", t.excelImportColumnLabelProtein],
    ["lipidG", t.excelImportColumnLabelLipid],
    ["glucidG", t.excelImportColumnLabelGlucid],
    ["sodiumMg", t.excelImportColumnLabelSodium],
    ["potassiumMg", t.excelImportColumnLabelPotassium],
    ["waterG", t.excelImportColumnLabelWater],
  ];

  function rebuild(nextMapping: ImportColumnMap) {
    setMapping(nextMapping);
    setRows(parseImportRows(rawRows, nextMapping));
  }

  async function downloadTemplate() {
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(t.excelImportTemplateSheetName);
    sheet.addRow([
      t.excelImportColumnLabelDietCode,
      t.excelImportColumnLabelDishName,
      t.excelImportColumnLabelFoodName,
      t.excelImportColumnLabelGrams,
      t.excelImportColumnLabelEnergy,
      t.excelImportColumnLabelProtein,
      t.excelImportColumnLabelLipid,
      t.excelImportColumnLabelGlucid,
      t.excelImportColumnLabelSodium,
      t.excelImportColumnLabelPotassium,
      t.excelImportColumnLabelWater,
      t.excelImportMealLabel,
    ]);
    sheet.addRow([meals[0]?.code ?? "COM_THUONG", t.excelImportTemplateSampleDishName, "", "", "", "", "", "", "", "", "", mealName]);
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
      setStatus(requiredImportFields.every((field) => nextMapping[field] !== undefined) ? t.excelImportStatusDetected : t.excelImportStatusManual);
    } catch {
      setStatus(t.excelImportStatusUnreadable);
    } finally {
      setBusy(false);
    }
  }

  async function analyzeWithAi() {
    setBusy(true);
    setStatus(t.excelImportStatusAnalyzing);
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
      if (!response.ok || !data.mapping) throw new Error(data.error || t.excelImportStatusFailed);
      rebuild({ ...mapping, ...data.mapping });
      setStatus(t.excelImportStatusMapped);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t.excelImportStatusFailed);
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
          dishName: row.dishName || t.defaultDish,
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
          {t.excelImportTriggerLabel}
        </button>
      </DialogTrigger>
      <DialogContent className="nutrition-import-dialog max-h-[92vh] max-w-6xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t.excelImportDialogTitle}</DialogTitle>
          <DialogDescription>{t.excelImportDialogDescription}</DialogDescription>
        </DialogHeader>
        {!headers.length ? (
          <div className="nutrition-import-start">
            <button type="button" className="nutrition-import-drop" onClick={() => inputRef.current?.click()}>
              <Upload />
              <strong>{t.excelImportChooseFileLabel}</strong>
              <span>{t.excelImportFileHint}</span>
            </button>
            <button type="button" className="nutrition-import-template" onClick={downloadTemplate}>
              <Download /> {t.excelImportTemplateDownloadLabel}
            </button>
          </div>
        ) : (
          <div className="nutrition-import-body">
            <section className="nutrition-import-mapping">
              <strong>{t.excelImportMappingTitle}</strong>
              {fieldLabels.map(([field, label]) => (
                <label key={field}>
                  {label}
                  <select
                    value={mapping[field] ?? ""}
                    onChange={(event) =>
                      rebuild({
                        ...mapping,
                        [field]: event.target.value === "" ? undefined : Number(event.target.value),
                      })
                    }
                  >
                    <option value="">{t.excelImportEmptyOption}</option>
                    {headers.map((header, index) => (
                      <option key={`${header}-${index}`} value={index}>
                        {header || t.excelImportColumnFallback.replace("{index}", String(index + 1))}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <label className="nutrition-ai-consent">
                <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
                {t.excelImportAiConsentLabel}
              </label>
              <button type="button" disabled={!consent || busy} onClick={analyzeWithAi}>
                <Sparkles />
                {t.excelImportAiButtonLabel}
              </button>
            </section>
            <section className="nutrition-import-preview">
              <header>
      <strong>{t.excelImportSheetPreviewLabel.replace("{count}", String(rows.length))}</strong>
                <span>{status}</span>
              </header>
              <div>
                <table>
                  <thead>
                    <tr>
                      <th>{t.excelImportRowLabel}</th>
                      <th>{t.excelImportMealColumnLabel}</th>
                      <th>{t.excelImportColumnLabelMealName}</th>
                      <th>{t.excelImportColumnLabelDishName}</th>
                      <th>{t.excelImportFoodColumnLabel}</th>
                      <th>{t.excelImportGramsColumnLabel}</th>
                      <th>{t.excelImportEnergyColumnLabel}</th>
                      <th>{t.excelImportProteinColumnLabel}</th>
                      <th>{t.excelImportLipidColumnLabel}</th>
                      <th>{t.excelImportGlucidColumnLabel}</th>
                      <th>{t.excelImportStatusColumnLabel}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => {
                      const meal = mealByCode.get(row.dietCode.toLocaleLowerCase("vi"));
                      const warning = !meal
                        ? t.excelImportSelectRightCodeWarning
                        : meal.approved
                          ? t.excelImportCodeAutoLockedWarning
                          : row.warnings.filter((item) => item !== t.excelImportNoCodeWarning).join(" · ");
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
                              <option value="">{t.excelImportNoMealOption}</option>
                              {meals.map((option) => (
                                <option key={option.id} value={option.code} disabled={option.approved}>
                                  {option.code}
                                  {option.approved ? t.excelImportLockedSuffix : ""}
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
                          <td>{warning || t.excelImportStatusReady}</td>
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
            {headers.length ? t.excelImportChooseAnotherFileLabel : t.excelImportChooseFileAgainLabel}
          </button>
          <button
            type="button"
            className="primary-action"
            disabled={!validRows.length || busy}
            onClick={() => {
              onApply(validRows);
              setOpen(false);
              setStatus(t.excelImportAddedMessage.replace("{count}", String(validRows.length)));
            }}
          >
            {t.excelImportApplyButtonLabel.replace("{count}", String(validRows.length || 0))}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
