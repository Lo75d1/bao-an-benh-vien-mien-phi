"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { BookOpen, Check, ClipboardCopy, FileDown, GripVertical, MoreVertical, Plus, Save, Search, Trash2 } from "lucide-react";
import type { DietCodeThresholds } from "@suat-an/nutrition-engine";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MenuFoodSearch } from "./nutrition-2598/MenuFoodSearch";
import { dishToMenuItems, foodToMenuItem, type DishResult, type FoodResult } from "./nutrition-2598/types";
import { assessMenuDataQuality, calculateMenuTotals, type MenuItemInput, type MenuNutrientKey } from "@/lib/menu-logic";
import { MenuExcelImportDialog } from "./menu-excel-import-dialog";
import type { Language } from "@/lib/i18n";

type Meal = {
  id: string;
  dietTypeId: string;
  code: string;
  name: string;
  approved: boolean;
  patientVisibleNote: string;
  thresholds: DietCodeThresholds | null;
  items: MenuItemInput[];
};
type Template = {
  id: string;
  name: string;
  dietTypeId: string | null;
  items: MenuItemInput[];
};
type CopySet = {
  id: string;
  label: string;
  meals: Array<{ code: string; items: MenuItemInput[] }>;
};
type Context = {
  eventId: string;
  date: string;
  mealName: string;
  feedingRoute: "NORMAL" | "SONDE";
};
type ActiveDish = { mealId: string; name: string };
const TEXT = {
  vi: {
    protein: "Đạm",
    lipid: "Béo",
    glucid: "Bột đường",
    sodium: "Natri",
    potassium: "Kali",
    water: "Nước",
    actionHint: "Bấm để chọn hoặc xem khuyến nghị",
    noHint: "Chưa gắn khuyến nghị",
    chooseCodeSearch: "Chọn mã này để tìm kiếm",
    recommendationInfo: "Thông tin khuyến nghị",
    clearConfirm: (code: string) => `Xóa tất cả món của mã ${code}?`,
    clearAll: "Xóa tất cả món",
    addDish: "Thêm món",
    locked: "Đã khóa",
    editable: "Còn sửa",
    analysis: "Phân tích bữa ăn theo một suất",
    exportExcel: "Xuất Excel",
    exportPdf: "Xuất PDF",
    oneDayRecommendation: "Mức đáp ứng khuyến nghị một ngày",
    addFromExcel: "Đã thêm hàng từ Excel vào bản nháp. Thực phẩm chưa liên kết giữ dinh dưỡng theo tệp hoặc “—”.",
    copyMenu: "Sao chép thực đơn",
    copyOther: "Sao chép từ ngày khác",
    copyTitle: "Sao chép thực đơn từ bữa khác",
    copyDesc: "Chọn một ngày và bữa nguồn. Hệ thống ghép theo mã chế độ ăn và không thay đổi mã đã khóa.",
    copyEmpty: "— · Chưa có bữa nguồn để sao chép.",
    savedTemplates: "Mẫu đã lưu",
    templateTitle: "Mẫu thực đơn đã lưu",
    templateDesc: (code: string) => `Chọn mẫu để áp dụng cho mã đang chỉnh: ${code}.`,
    templateSource: (code: string) => `Mẫu lấy từ ${code}; dữ liệu nguồn không bị thay đổi.`,
    saveMenu: "Lưu thực đơn",
    dishSearchPlaceholder: "Tìm món ăn cho mã đang chọn…",
    foodSearchPlaceholder: "Tìm thực phẩm để thêm vào món…",
    dishDialogPlaceholder: "Tìm thực phẩm để thêm vào món này…",
    noFood: "Chưa có thực phẩm",
    patientNote: "Ghi chú dành cho bệnh nhân",
    saveCode: "Lưu mã này",
    menuEntry: "Lên thực đơn",
    mealAnalysis: "Phân tích",
    workflowSteps: "Hai bước nghiệp vụ",
    dateData: "Ngày · Dữ liệu từ",
    meal: "Bữa",
    codeCount: "Số mã",
    codesWithMenu: "mã có thực đơn",
    foods: "thực phẩm",
    noTemplate: "— · Chưa có mẫu.",
    saveMealTemplate: "Lưu mẫu bữa này",
    saveTemplateTitle: "Lưu mã đang chỉnh làm mẫu",
    templateName: "Tên mẫu",
    saveTemplate: "Lưu mẫu",
    draftSaved: (code: string) => `Đã lưu bản nháp mã ${code} trên máy này.`,
    viewRecommendation: "Xem khuyến nghị",
    copyCode: (code: string) => `Sao chép toàn bộ mã ${code}`,
    actual: "Thực tế",
    partialMissing: "Thiếu một phần · vẫn lưu được",
    essentialMissing: "Thiếu dữ liệu thiết yếu",
    dishActions: (dish: string) => `Thao tác món ${dish}`,
    duplicateBeside: "Nhân đôi bên cạnh",
    deleteDish: "Xóa món",
    createBlankDish: "Tạo món trống rồi thêm thực phẩm",
    findExistingDish: "Tìm món có sẵn",
    duplicateLastDish: "Nhân đôi món cuối",
    analysisHelp: "Không nhân số suất; dữ liệu thiếu giữ “—”.",
    ingredientsPerServing: "Nguyên liệu có trong bữa ăn · gram/1 suất",
    food: "Thực phẩm",
    total: "Tổng",
    code: "Mã",
    actualEnergy: "Năng lượng thực tế",
    dietitianTarget: "Mục tiêu NVDD",
    adherence: "Đáp ứng",
    readyToSave: (count: number) => `${count} mã sẵn sàng lưu`,
    blockedSave: (codes: string) => `${codes} thiếu dữ liệu thiết yếu — bổ sung trước khi lưu.`,
    editing: "Đang chỉnh",
    dishes: "Món ăn",
    switchAnalysis: "Chuyển sang phân tích",
    dishDescription: "Thành phần và dinh dưỡng theo đúng gram của một suất; dữ liệu thiếu giữ “—”.",
    cleanGrams: "Gram sạch/suất",
    waste: "Thải bỏ",
    note: "Ghi chú",
    addedDish: (dish: string, code: string) => `Đã thêm món ${dish} vào mã ${code}.`,
    copiedMenu: (label: string) => `Đã sao chép thực đơn từ ${label}. Hãy kiểm tra lại rồi bấm Lưu thực đơn.`,
    copyConfirm: (label: string) => `Sao chép toàn bộ thực đơn từ ${label}? Nội dung nháp của các mã chưa khóa sẽ được thay thế.`,
    importedRows: (count: number) => `Đã thêm ${count} hàng từ Excel vào bản nháp. Thực phẩm chưa liên kết giữ dinh dưỡng theo tệp hoặc “—”.`,
    deleteItem: (name: string) => `Xóa ${name}`,
    recommendationTitle: "Khuyến nghị",
    recommendationDescription: "Ngưỡng chuyên môn do Admin liên kết từ danh mục mã chế độ ăn; năng lượng do dinh dưỡng viên nhập tại hàng mã.",
    dietitianEnergy: "Năng lượng NVDD",
    patientNotePlaceholder: "Ví dụ: Món được chế biến nhạt, dùng khi còn ấm…",
    patientNoteHelp: "Nội dung này được công khai cùng đúng bữa và mã chế độ ăn. Không nhập thông tin nội bộ hoặc hồ sơ bệnh án.",
    exportSheet: "Thực đơn",
    exportHeaders: ["Ngày", "Bữa", "Mã", "Tên chế độ", "Món", "Thực phẩm", "Gram/suất"],
    defaultDish: "Món 1",
    newDish: "Món mới",
    copySuffix: "bản sao",
    perServing: "suất",
  },
  en: {
    protein: "Protein",
    lipid: "Fat",
    glucid: "Carb",
    sodium: "Sodium",
    potassium: "Potassium",
    water: "Water",
    actionHint: "Choose or view recommendation",
    noHint: "No recommendation linked",
    chooseCodeSearch: "Choose this code to search",
    recommendationInfo: "Recommendation details",
    clearConfirm: (code: string) => `Delete all dishes for code ${code}?`,
    clearAll: "Delete all dishes",
    addDish: "Add dish",
    locked: "Locked",
    editable: "Editable",
    analysis: "Meal analysis by serving",
    exportExcel: "Export Excel",
    exportPdf: "Export PDF",
    oneDayRecommendation: "One-day recommendation adherence",
    addFromExcel: "Added Excel rows to the draft. Unlinked foods keep the file nutrients or “—”.",
    copyMenu: "Copy menu",
    copyOther: "Copy from another date",
    copyTitle: "Copy menu from another meal",
    copyDesc: "Choose a source date and meal. The system matches diet codes and does not change locked codes.",
    copyEmpty: "— · No source meal to copy yet.",
    savedTemplates: "Saved templates",
    templateTitle: "Saved menu templates",
    templateDesc: (code: string) => `Choose a template to apply to the current code: ${code}.`,
    templateSource: (code: string) => `Template from ${code}; source data is unchanged.`,
    saveMenu: "Save menu",
    dishSearchPlaceholder: "Search dishes for the selected code…",
    foodSearchPlaceholder: "Search foods to add to a dish…",
    dishDialogPlaceholder: "Search foods to add to this dish…",
    noFood: "No foods yet",
    patientNote: "Patient-visible note",
    saveCode: "Save this code",
    menuEntry: "Plan menu",
    mealAnalysis: "Analysis",
    workflowSteps: "Two-step workflow",
    dateData: "Date · Data from",
    meal: "Meal",
    codeCount: "Codes",
    codesWithMenu: "codes with menus",
    foods: "foods",
    noTemplate: "— · No templates yet.",
    saveMealTemplate: "Save meal template",
    saveTemplateTitle: "Save current code as template",
    templateName: "Template name",
    saveTemplate: "Save template",
    draftSaved: (code: string) => `Draft for code ${code} saved on this device.`,
    viewRecommendation: "View recommendation",
    copyCode: (code: string) => `Copy all items for code ${code}`,
    actual: "Actual",
    partialMissing: "Partially incomplete · can still be saved",
    essentialMissing: "Required data missing",
    dishActions: (dish: string) => `Actions for dish ${dish}`,
    duplicateBeside: "Duplicate next to this dish",
    deleteDish: "Delete dish",
    createBlankDish: "Create an empty dish and add foods",
    findExistingDish: "Find an existing dish",
    duplicateLastDish: "Duplicate last dish",
    analysisHelp: "Per-serving values only; missing data remains “—”.",
    ingredientsPerServing: "Meal ingredients · grams per serving",
    food: "Food",
    total: "Total",
    code: "Code",
    actualEnergy: "Actual energy",
    dietitianTarget: "Dietitian target",
    adherence: "Adherence",
    readyToSave: (count: number) => `${count} codes ready to save`,
    blockedSave: (codes: string) => `${codes} are missing required data. Complete them before saving.`,
    editing: "Editing",
    dishes: "Dishes",
    switchAnalysis: "Continue to analysis",
    dishDescription: "Ingredients and nutrients use the exact grams per serving; missing data remains “—”.",
    cleanGrams: "Edible g/serving",
    waste: "Waste",
    note: "Note",
    addedDish: (dish: string, code: string) => `Added ${dish} to code ${code}.`,
    copiedMenu: (label: string) => `Copied the menu from ${label}. Review it, then select Save menu.`,
    copyConfirm: (label: string) => `Copy the entire menu from ${label}? Drafts for unlocked codes will be replaced.`,
    importedRows: (count: number) => `Added ${count} Excel rows to the draft. Unlinked foods keep the file nutrients or “—”.`,
    deleteItem: (name: string) => `Delete ${name}`,
    recommendationTitle: "Recommendation",
    recommendationDescription: "Clinical thresholds are linked by Admin from the diet-code catalog; the dietitian enters the energy target on each code row.",
    dietitianEnergy: "Dietitian energy target",
    patientNotePlaceholder: "Example: Prepared with less salt; serve warm…",
    patientNoteHelp: "This content is published with the selected meal and diet code. Do not enter internal information or medical-record details.",
    exportSheet: "Menu",
    exportHeaders: ["Date", "Meal", "Code", "Diet name", "Dish", "Food", "Grams/serving"],
    defaultDish: "Dish 1",
    newDish: "New dish",
    copySuffix: "copy",
    perServing: "serving",
  },
} as const;
const number = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
const nutrients: Array<{
  key: MenuNutrientKey;
  label: string;
  unit: string;
  min: keyof DietCodeThresholds;
  max: keyof DietCodeThresholds;
}> = [
  {
    key: "proteinG",
    label: "Đạm",
    unit: "g",
    min: "proteinGMin",
    max: "proteinGMax",
  },
  {
    key: "lipidG",
    label: "Béo",
    unit: "g",
    min: "lipidGMin",
    max: "lipidGMax",
  },
  {
    key: "glucidG",
    label: "Bột đường",
    unit: "g",
    min: "glucidGMin",
    max: "glucidGMax",
  },
  {
    key: "sodiumMg",
    label: "Natri",
    unit: "mg",
    min: "sodiumMgMin",
    max: "sodiumMgMax",
  },
  {
    key: "potassiumMg",
    label: "Kali",
    unit: "mg",
    min: "potassiumMgMin",
    max: "potassiumMgMax",
  },
  {
    key: "waterG",
    label: "Nước",
    unit: "g",
    min: "waterGMin",
    max: "waterGMax",
  },
];
const emptyNutrients = {
  energyKcal: null,
  proteinG: null,
  lipidG: null,
  glucidG: null,
  sodiumMg: null,
  potassiumMg: null,
  waterG: null,
};

function clone(items: MenuItemInput[]) {
  return items.map((item) => ({ ...item, nutrients: { ...item.nutrients } }));
}
function dishes(items: MenuItemInput[], fallback: string) {
  return [...new Set(items.map((item) => item.dishName?.trim() || fallback))];
}
function kcal(items: MenuItemInput[]) {
  if (!items.length) return "—";
  const value = calculateMenuTotals(items).energyKcal;
  return value === null ? "—" : number.format(value);
}
function portionNutrient(item: MenuItemInput, key: MenuNutrientKey) {
  const value = item.nutrients[key];
  return value === null || !Number.isFinite(value) || !Number.isFinite(item.grams) ? "—" : number.format((value * item.grams) / 100);
}
function targetOf(thresholds: DietCodeThresholds | null, min: keyof DietCodeThresholds, max: keyof DietCodeThresholds) {
  if (!thresholds) return null;
  const high = thresholds[max];
  const low = thresholds[min];
  return typeof high === "number" ? high : typeof low === "number" ? low : null;
}

function CodeActions({ meal, language, onChoose, onRecommendation, onClear, onSave }: { meal: Meal; language: Language; onChoose: () => void; onRecommendation: () => void; onClear: () => void; onSave: () => void }) {
  const t = TEXT[language];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="nutrition-code-actions">
          <strong translate="no">{meal.code}</strong>
          <span>{meal.name}</span>
          <small>{meal.thresholds ? t.actionHint : t.noHint}</small>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="nutrition-code-action-menu">
        <DropdownMenuItem onSelect={onChoose}>
          <Search /> {t.chooseCodeSearch}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onRecommendation}>
          <BookOpen /> {t.recommendationInfo}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={meal.approved}
          onSelect={() => {
            if (window.confirm(t.clearConfirm(meal.code))) onClear();
          }}
        >
          <Trash2 /> {t.clearAll}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={meal.approved} onSelect={onSave}>
          <Save /> {t.saveCode}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MultiCodeMenuBoard({ meals, templates, copies, context, dataStartDate, language = "vi", saveAction, saveTemplateAction }: { meals: Meal[]; templates: Template[]; copies: CopySet[]; context: Context; dataStartDate: string; language?: Language; saveAction: (data: FormData) => void; saveTemplateAction: (data: FormData) => void }) {
  const t = TEXT[language];
  const fallbackDish: string = t.defaultDish;
  const nutrientLabel = (key: MenuNutrientKey) => ({ proteinG: t.protein, lipidG: t.lipid, glucidG: t.glucid, sodiumMg: t.sodium, potassiumMg: t.potassium, waterG: t.water, energyKcal: "kcal" })[key];
  const legacyStorageKey = `suat-an:menu-drafts:${context.eventId}:${context.feedingRoute}`;
  const storageKey = `suat-an:menu-drafts:v3:${context.eventId}:${context.feedingRoute}`;
  const targetKey = `${storageKey}:kcal-targets`;
  const noteKey = `${storageKey}:patient-notes`;
  const [step, setStep] = useState<"entry" | "analysis">("entry");
  const [menus, setMenus] = useState<Record<string, MenuItemInput[]>>(() => Object.fromEntries(meals.map((meal) => [meal.id, clone(meal.items)])));
  const [kcalTargets, setKcalTargets] = useState<Record<string, string>>({});
  const [patientNotes, setPatientNotes] = useState<Record<string, string>>(() => Object.fromEntries(meals.map((meal) => [meal.id, meal.patientVisibleNote])));
  const [activeId, setActiveId] = useState(meals.find((meal) => !meal.approved)?.id ?? meals[0]?.id ?? "");
  const [activeDish, setActiveDish] = useState<ActiveDish | null>(null);
  const [recommendationId, setRecommendationId] = useState<string | null>(null);
  const [searchKind, setSearchKind] = useState<"food" | "dish">("dish");
  const [dragged, setDragged] = useState<ActiveDish | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const commandSearchRef = useRef<HTMLInputElement>(null);
  const dialogSearchRef = useRef<HTMLInputElement>(null);
  const dishElements = useRef(new Map<string, HTMLElement>());
  const [pendingDishReveal, setPendingDishReveal] = useState<string | null>(null);
  const [pendingSearchFocus, setPendingSearchFocus] = useState<string | null>(null);
  const active = meals.find((meal) => meal.id === activeId) ?? meals[0];
  const recommendationMeal = meals.find((meal) => meal.id === recommendationId) ?? null;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(storageKey);
        const targets = window.localStorage.getItem(targetKey);
        const notes = window.localStorage.getItem(noteKey);
        if (saved)
          setMenus((current) => ({
            ...current,
            ...(JSON.parse(saved) as Record<string, MenuItemInput[]>),
          }));
        if (targets) setKcalTargets(JSON.parse(targets) as Record<string, string>);
        if (notes)
          setPatientNotes((current) => ({
            ...current,
            ...(JSON.parse(notes) as Record<string, string>),
          }));
        window.localStorage.removeItem(legacyStorageKey);
        window.localStorage.removeItem(`${legacyStorageKey}:kcal-targets`);
      } catch {
        window.localStorage.removeItem(storageKey);
        window.localStorage.removeItem(targetKey);
        window.localStorage.removeItem(noteKey);
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [legacyStorageKey, noteKey, storageKey, targetKey]);
  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(storageKey, JSON.stringify(menus));
      window.localStorage.setItem(targetKey, JSON.stringify(kcalTargets));
      window.localStorage.setItem(noteKey, JSON.stringify(patientNotes));
    }
  }, [hydrated, kcalTargets, menus, noteKey, patientNotes, storageKey, targetKey]);
  useEffect(() => {
    if (!pendingDishReveal) return;
    const element = dishElements.current.get(pendingDishReveal);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    setPendingDishReveal(null);
  }, [menus, pendingDishReveal]);
  useEffect(() => {
    if (!activeDish) return;
    const frame = window.requestAnimationFrame(() => {
      dialogSearchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      dialogSearchRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeDish]);
  useEffect(() => {
    if (!pendingSearchFocus || pendingSearchFocus !== activeId) return;
    const frame = window.requestAnimationFrame(() => {
      commandSearchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      commandSearchRef.current?.focus({ preventScroll: true });
      setPendingSearchFocus(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeId, pendingSearchFocus, searchKind]);

  const qualities = useMemo(() => Object.fromEntries(meals.map((meal) => [meal.id, assessMenuDataQuality(menus[meal.id] ?? [])])), [meals, menus]);
  const blockedDrafts = meals.filter((meal) => !meal.approved && (menus[meal.id] ?? []).length && qualities[meal.id]?.level === "BLOCKED");
  const savableMeals = meals.filter((meal) => !meal.approved && (menus[meal.id] ?? []).length && qualities[meal.id]?.level !== "BLOCKED");
  const payload = JSON.stringify(
    savableMeals.map((meal) => ({
      dietMealId: meal.id,
      items: menus[meal.id],
      patientVisibleNote: patientNotes[meal.id] ?? "",
    })),
  );
  const ingredientMatrix = useMemo(() => {
    const rows = new Map<string, { name: string; values: Record<string, number> }>();
    for (const meal of meals)
      for (const item of menus[meal.id] ?? []) {
        const key = item.foodId ?? `name:${item.itemName.toLocaleLowerCase("vi")}`;
        const row = rows.get(key) ?? { name: item.itemName, values: {} };
        row.values[meal.id] = (row.values[meal.id] ?? 0) + item.grams;
        rows.set(key, row);
      }
    return [...rows.values()].sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [meals, menus]);

  function selectCode(meal: Meal) {
    setActiveId(meal.id);
    setSearchKind("dish");
  }
  function focusDishSearch(meal: Meal) {
    setActiveId(meal.id);
    setSearchKind("dish");
    setPendingSearchFocus(meal.id);
  }
  function addFood(food: FoodResult, target = activeDish) {
    const mealId = target?.mealId ?? active?.id;
    if (!mealId) return;
    const meal = meals.find((item) => item.id === mealId);
    if (meal?.approved) return;
    const dishName = target?.name ?? t.newDish;
    setMenus((current) => ({
      ...current,
      [mealId]: [...(current[mealId] ?? []), foodToMenuItem(food, dishName)],
    }));
  }
  function addDish(dish: DishResult) {
    if (!active || active.approved) return;
    const rows = dishToMenuItems(dish);
    setMenus((current) => ({
      ...current,
      [active.id]: [...(current[active.id] ?? []), ...rows],
    }));
    setPendingDishReveal(`${active.id}:${dish.name}`);
    setImportMessage(t.addedDish(dish.name, active.code));
  }
  function patchItem(mealId: string, index: number, patch: Partial<MenuItemInput>) {
    setMenus((current) => ({
      ...current,
      [mealId]: (current[mealId] ?? []).map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
  }
  function removeDish(mealId: string, dish: string) {
    setMenus((current) => ({
      ...current,
      [mealId]: (current[mealId] ?? []).filter((item) => (item.dishName?.trim() || fallbackDish) !== dish),
    }));
    setActiveDish(null);
  }
  function duplicateDish(mealId: string, dish: string) {
    const items = menus[mealId] ?? [];
    const base = `${dish} · ${t.copySuffix}`;
    let name = base;
    let suffix = 2;
    while (items.some((item) => item.dishName === name)) name = `${base} ${suffix++}`;
    const copies = items
      .filter((item) => (item.dishName?.trim() || fallbackDish) === dish)
      .map((item) => ({
        ...item,
        dishName: name,
        nutrients: { ...item.nutrients },
      }));
    setMenus((current) => ({
      ...current,
      [mealId]: [...(current[mealId] ?? []), ...copies],
    }));
    setPendingDishReveal(`${mealId}:${name}`);
  }
  function dropDish(targetMealId: string, targetDish?: string) {
    if (!dragged) return;
    setMenus((current) => {
      const sourceRows = (current[dragged.mealId] ?? []).filter((item) => (item.dishName?.trim() || fallbackDish) === dragged.name);
      if (!sourceRows.length) return current;
      const next = { ...current };
      if (dragged.mealId === targetMealId) next[dragged.mealId] = (current[dragged.mealId] ?? []).filter((item) => (item.dishName?.trim() || fallbackDish) !== dragged.name);
      const target = [...(next[targetMealId] ?? [])];
      const insertAt = targetDish ? target.findIndex((item) => (item.dishName?.trim() || fallbackDish) === targetDish) : -1;
      const moved = sourceRows.map((item) => ({
        ...item,
        nutrients: { ...item.nutrients },
      }));
      if (insertAt < 0) target.push(...moved);
      else target.splice(insertAt, 0, ...moved);
      next[targetMealId] = target;
      return next;
    });
    setDragged(null);
  }
  function newDish(meal: Meal) {
    if (meal.approved) return;
    setActiveId(meal.id);
    const names = dishes(menus[meal.id] ?? [], fallbackDish);
    let name: string = t.newDish;
    let index = 2;
    while (names.includes(name)) name = `${t.newDish} ${index++}`;
    setActiveDish({ mealId: meal.id, name });
    setSearchKind("food");
  }
  function applyTemplate(template: Template) {
    if (!active || active.approved) return;
    setMenus((current) => ({ ...current, [active.id]: clone(template.items) }));
  }
  function applyCopy(source: CopySet) {
    if (!window.confirm(t.copyConfirm(source.label))) return;
    const byCode = new Map(source.meals.map((meal) => [meal.code, meal.items]));
    setMenus((current) => {
      const next = { ...current };
      for (const meal of meals) {
        const sourceItems = byCode.get(meal.code);
        if (!meal.approved && sourceItems?.length) next[meal.id] = clone(sourceItems);
      }
      return next;
    });
    setImportMessage(t.copiedMenu(source.label));
  }
  function applyImportedRows(rows: Array<{ mealId: string; item: MenuItemInput }>) {
    setMenus((current) => {
      const next = { ...current };
      for (const row of rows) next[row.mealId] = [...(next[row.mealId] ?? []), row.item];
      return next;
    });
    setImportMessage(t.importedRows(rows.length));
  }

  async function exportExcel() {
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(t.exportSheet);
    sheet.addRow([...t.exportHeaders]);
    for (const meal of meals) for (const item of menus[meal.id] ?? []) sheet.addRow([context.date, context.mealName, meal.code, meal.name, item.dishName ?? fallbackDish, item.itemName, item.grams]);
    sheet.columns.forEach((column) => {
      column.width = 22;
    });
    const data = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(
      new Blob([new Uint8Array(data)], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `thuc-don-${context.date.replaceAll("/", "-")}-${context.mealName}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section className="nutrition-menu-workbench">
      <header className="nutrition-menu-context">
        <div className="nutrition-step-switch" role="tablist" aria-label={t.workflowSteps}>
          <button type="button" role="tab" aria-selected={step === "entry"} className={step === "entry" ? "active" : ""} onClick={() => setStep("entry")}>
            1 · {t.menuEntry}
          </button>
          <button type="button" role="tab" aria-selected={step === "analysis"} className={step === "analysis" ? "active" : ""} onClick={() => setStep("analysis")}>
            2 · {t.mealAnalysis}
          </button>
        </div>
        <dl>
          <div>
            <dt>{t.dateData} {dataStartDate}</dt>
            <dd>{context.date}</dd>
          </div>
          <div>
            <dt>{t.meal}</dt>
            <dd>{context.mealName}</dd>
          </div>
          <div>
            <dt>{t.codeCount}</dt>
            <dd>{meals.length}</dd>
          </div>
        </dl>
        <div className="nutrition-context-tools">
          <MenuExcelImportDialog
            mealName={context.mealName}
            meals={meals.map(({ id, code, approved }) => ({
              id,
              code,
              approved,
            }))}
            onApply={applyImportedRows}
            language={language}
          />
          <div className="nutrition-context-actions">
            <Dialog>
              <DialogTrigger asChild>
                <button type="button">
                  <ClipboardCopy />
                  {t.copyOther}
                </button>
              </DialogTrigger>
              <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t.copyTitle}</DialogTitle>
                  <DialogDescription>{t.copyDesc}</DialogDescription>
                </DialogHeader>
                <div className="nutrition-template-list">
                  {copies.length ? (
                    copies.map((source) => (
                      <button type="button" key={source.id} onClick={() => applyCopy(source)}>
                        <strong>{source.label}</strong>
                        <span>{source.meals.filter((meal) => meal.items.length).length} {t.codesWithMenu}</span>
                      </button>
                    ))
                  ) : (
                    <p>{t.copyEmpty}</p>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Dialog>
              <DialogTrigger asChild>
                <button type="button">
                  <BookOpen />
                  {t.savedTemplates}
                </button>
              </DialogTrigger>
              <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t.templateTitle}</DialogTitle>
                  <DialogDescription>{t.templateDesc(active?.code ?? "—")}</DialogDescription>
                </DialogHeader>
                <div className="nutrition-template-list">
                  {templates.length ? (
                    templates.map((template) => (
                      <button type="button" key={template.id} onClick={() => applyTemplate(template)}>
                        <strong>{template.name}</strong>
                        <span>{template.items.length} {t.foods}</span>
                      </button>
                    ))
                  ) : (
                    <p>{t.noTemplate}</p>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Dialog>
              <DialogTrigger asChild>
                <button type="button">
                  <Save />
                  {t.saveMealTemplate}
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t.saveTemplateTitle}</DialogTitle>
                  <DialogDescription>{t.templateSource(active?.code ?? "—")}</DialogDescription>
                </DialogHeader>
                {active ? (
                  <form action={saveTemplateAction} className="nutrition-save-template">
                    <input type="hidden" name="dietMealId" value={active.id} />
                    <input type="hidden" name="dietTypeId" value={active.dietTypeId} />
                    <input type="hidden" name="feedingRoute" value={context.feedingRoute} />
                    <input type="hidden" name="items" value={JSON.stringify(menus[active.id] ?? [])} />
                    <label>
                      {t.templateName}
                      <input name="templateName" required minLength={2} maxLength={100} />
                    </label>
                    <button className="primary-action">{t.saveTemplate}</button>
                  </form>
                ) : null}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {step === "entry" ? (
        <div className="nutrition-code-canvas">
          {meals.map((meal) => {
            const items = menus[meal.id] ?? [];
            const dishNames = dishes(items, fallbackDish);
            const quality = qualities[meal.id];
            return (
              <article className={`nutrition-code-row ${activeId === meal.id ? "active" : ""} quality-${quality.level.toLowerCase()}`} key={meal.id} onDragOver={(event) => event.preventDefault()} onDrop={() => dropDish(meal.id)}>
                <CodeActions
                  meal={meal}
                  language={language}
                  onChoose={() => {
                    selectCode(meal);
                    window.setTimeout(() => document.querySelector<HTMLInputElement>(".nutrition-menu-command input")?.focus(), 0);
                  }}
                  onRecommendation={() => setRecommendationId(meal.id)}
                  onClear={() => setMenus((current) => ({ ...current, [meal.id]: [] }))}
                  onSave={() => {
                    selectCode(meal);
                    setImportMessage(t.draftSaved(meal.code));
                  }}
                />
                <header onClick={() => selectCode(meal)}>
                  <button
                    type="button"
                    className="nutrition-code-name"
                    onClick={() => {
                      selectCode(meal);
                      setRecommendationId(meal.id);
                    }}
                  >
                    <strong translate="no">{meal.code}</strong>
                    <span>{meal.name}</span>
                    <small>{meal.thresholds ? t.viewRecommendation : t.noHint}</small>
                  </button>
                  <button
                    type="button"
                    className="icon-action"
                    aria-label={t.copyCode(meal.code)}
                    disabled={!items.length || meal.approved}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (active && active.id !== meal.id)
                        setMenus((current) => ({
                          ...current,
                          [active.id]: clone(items),
                        }));
                    }}
                  >
                    <ClipboardCopy />
                  </button>
                  <label className="nutrition-kcal-target">
                    kcal/{t.perServing}
                    <input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="—"
                      value={kcalTargets[meal.id] ?? ""}
                      disabled={meal.approved}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) =>
                        setKcalTargets((current) => ({
                          ...current,
                          [meal.id]: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <span className="nutrition-kcal-actual">{t.actual} {kcal(items)} kcal</span>
                  {items.length && quality.level === "WARNING" ? <b className="quality-badge warning">{t.partialMissing}</b> : null}
                  {items.length && quality.level === "BLOCKED" ? <b className="quality-badge blocked">{t.essentialMissing}</b> : null}
                  {meal.approved ? (
                    <b className="approved">
                      <Check />
                      {t.locked}
                    </b>
                  ) : null}
                </header>
                <div className="nutrition-dish-strip">
                  {dishNames.map((dish) => {
                    const rows = items.filter((item) => (item.dishName?.trim() || fallbackDish) === dish);
                    return (
                      <article
                        className="nutrition-dish-card"
                        key={dish}
                        ref={(element) => { const key = `${meal.id}:${dish}`; if (element) dishElements.current.set(key, element); else dishElements.current.delete(key); }}
                        draggable={!meal.approved}
                        onDragStart={(event: DragEvent<HTMLElement>) => {
                          event.dataTransfer.effectAllowed = dragged?.mealId === meal.id ? "move" : "copy";
                          setDragged({ mealId: meal.id, name: dish });
                        }}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.stopPropagation();
                          dropDish(meal.id, dish);
                        }}
                      >
                        <button
                          type="button"
                          className="nutrition-dish-main"
                          onClick={() => {
                            selectCode(meal);
                            setActiveDish({ mealId: meal.id, name: dish });
                            setSearchKind("food");
                          }}
                        >
                          <GripVertical />
                          <strong>{dish}</strong>
                          <span>{kcal(rows)} kcal</span>
                          <small>{rows.length ? rows.map((item) => `${item.itemName} ${number.format(item.grams)}g`).join(" · ") : t.noFood}</small>
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button type="button" className="dish-more" aria-label={t.dishActions(dish)}>
                              <MoreVertical />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onSelect={() => duplicateDish(meal.id, dish)}>{t.duplicateBeside}</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => removeDish(meal.id, dish)} disabled={meal.approved}>
                              {t.deleteDish}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </article>
                    );
                  })}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="nutrition-add-dish" disabled={meal.approved} onClick={() => selectCode(meal)}>
                        <Plus />
                        {t.addDish}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onSelect={() => newDish(meal)}>{t.createBlankDish}</DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => focusDishSearch(meal)}
                      >
                        {t.findExistingDish}
                      </DropdownMenuItem>
                      {dishNames.length ? <DropdownMenuItem onSelect={() => duplicateDish(meal.id, dishNames[dishNames.length - 1])}>{t.duplicateLastDish}</DropdownMenuItem> : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="nutrition-analysis-panel">
          <header>
            <div>
              <h2>{t.analysis}</h2>
              <p>{t.analysisHelp}</p>
            </div>
            <div>
              <button type="button" onClick={exportExcel}>
                <FileDown />
                {t.exportExcel}
              </button>
              <button type="button" onClick={() => window.print()}>
                <FileDown />
                {t.exportPdf}
              </button>
            </div>
          </header>
          {importMessage ? (
            <p className="nutrition-import-message" role="status">
              {importMessage}
            </p>
          ) : null}
          <section>
            <h3>{t.ingredientsPerServing}</h3>
            <div className="nutrition-matrix-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{t.food}</th>
                    {meals.map((meal) => (
                      <th key={meal.id}>{meal.code}</th>
                    ))}
                    <th>{t.total}</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredientMatrix.map((row) => (
                    <tr key={row.name}>
                      <th>{row.name}</th>
                      {meals.map((meal) => (
                        <td key={meal.id}>{row.values[meal.id] === undefined ? "—" : number.format(row.values[meal.id])}</td>
                      ))}
                      <td>{number.format(Object.values(row.values).reduce((sum, value) => sum + value, 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section>
            <h3>{t.oneDayRecommendation}</h3>
            <div className="nutrition-matrix-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{t.code}</th>
                    <th>{t.actualEnergy}</th>
                    <th>{t.dietitianTarget}</th>
                    <th>{t.adherence}</th>
                    {nutrients.map((item) => (
                      <th key={item.key}>{nutrientLabel(item.key)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {meals.map((meal) => {
                    const mealItems = menus[meal.id] ?? [];
                    const totals = mealItems.length ? calculateMenuTotals(mealItems) : null;
                    const energyTarget = Number(kcalTargets[meal.id]) || null;
                    return (
                      <tr key={meal.id}>
                        <th>{meal.code}</th>
                        <td>{totals?.energyKcal === null || totals?.energyKcal === undefined ? "—" : `${number.format(totals.energyKcal)} kcal`}</td>
                        <td>{energyTarget === null ? "—" : `${number.format(energyTarget)} kcal`}</td>
                        <td>{totals?.energyKcal === null || totals?.energyKcal === undefined || energyTarget === null ? "—" : `${number.format((totals.energyKcal / energyTarget) * 100)}%`}</td>
                        {nutrients.map((item) => {
                          const actual = totals?.[item.key] ?? null;
                          const target = targetOf(meal.thresholds, item.min, item.max);
                          return <td key={item.key}>{actual === null || target === null ? "—" : `${number.format((actual / target) * 100)}%`}</td>;
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          <form action={saveAction} className="nutrition-analysis-actions">
            <input type="hidden" name="menus" value={payload} />
            <div className="nutrition-save-status">
              <span>{t.readyToSave(savableMeals.length)}</span>
              {blockedDrafts.length ? <strong>{t.blockedSave(blockedDrafts.map((meal) => meal.code).join(", "))}</strong> : null}
            </div>
            <button className="primary-action" disabled={payload === "[]" || blockedDrafts.length > 0}>
              {t.saveMenu}
            </button>
          </form>
        </div>
      )}

      {step === "entry" ? (
        <footer className="nutrition-menu-command">
          <strong>{t.editing}: {active?.code ?? "—"}</strong>
          <button type="button" className={searchKind === "dish" ? "active" : ""} onClick={() => setSearchKind("dish")}>
            {t.dishes}
          </button>
          <button type="button" className={searchKind === "food" ? "active" : ""} onClick={() => setSearchKind("food")}>
            {t.food}
          </button>
          <div className="nutrition-command-search">
            <Search />
            <MenuFoodSearch inputRef={commandSearchRef} kind={searchKind} filterIconOnly onPickFood={(food) => addFood(food, null)} onPickDish={addDish} placeholder={searchKind === "dish" ? t.dishSearchPlaceholder : t.foodSearchPlaceholder} language={language} />
          </div>
          <button type="button" className="primary-action" onClick={() => setStep("analysis")}>
            {t.switchAnalysis}
          </button>
        </footer>
      ) : null}

      <Dialog
        open={Boolean(activeDish)}
        onOpenChange={(open) => {
          if (!open) setActiveDish(null);
        }}
      >
        {activeDish ? (
          <DialogContent className="nutrition-dish-dialog max-h-[88vh] max-w-[min(96vw,1280px)] overflow-hidden">
            <DialogHeader>
              <DialogTitle>{activeDish.name}</DialogTitle>
              <DialogDescription>{t.dishDescription}</DialogDescription>
            </DialogHeader>
            <div className="nutrition-dish-table">
              <table>
                <thead>
                  <tr>
                    <th>{t.food}</th>
                    <th>{t.cleanGrams}</th>
                    <th>kcal</th>
                    <th>{t.protein} (g)</th>
                    <th>{t.lipid} (g)</th>
                    <th>{t.glucid} (g)</th>
                    <th>{t.waste}</th>
                    <th>{t.note}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {(menus[activeDish.mealId] ?? []).map((item, index) =>
                    (item.dishName?.trim() || fallbackDish) === activeDish.name ? (
                      <tr key={`${item.itemName}-${index}`}>
                        <td>{item.itemName}</td>
                        <td>
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={item.grams}
                            onChange={(event) =>
                              patchItem(activeDish.mealId, index, {
                                grams: Number(event.target.value),
                              })
                            }
                          />
                        </td>
                        <td>{portionNutrient(item, "energyKcal")}</td>
                        <td>{portionNutrient(item, "proteinG")}</td>
                        <td>{portionNutrient(item, "lipidG")}</td>
                        <td>{portionNutrient(item, "glucidG")}</td>
                        <td>{item.wastePercent === null ? "—" : `${number.format(item.wastePercent)}%`}</td>
                        <td>
                          <input
                            value={item.note ?? ""}
                            onChange={(event) =>
                              patchItem(activeDish.mealId, index, {
                                note: event.target.value,
                              })
                            }
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            aria-label={t.deleteItem(item.itemName)}
                            onClick={() =>
                              setMenus((current) => ({
                                ...current,
                                [activeDish.mealId]: (current[activeDish.mealId] ?? []).filter((_, itemIndex) => itemIndex !== index),
                              }))
                            }
                          >
                            <Trash2 />
                          </button>
                        </td>
                      </tr>
                    ) : null,
                  )}
                </tbody>
              </table>
            </div>
            <div className="nutrition-dialog-search">
              <Search />
              <MenuFoodSearch inputRef={dialogSearchRef} kind="food" filterIconOnly onPickFood={(food) => addFood(food, activeDish)} placeholder={t.dishDialogPlaceholder} language={language} />
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
      <Dialog
        open={Boolean(recommendationMeal)}
        onOpenChange={(open) => {
          if (!open) setRecommendationId(null);
        }}
      >
        {recommendationMeal ? (
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{t.recommendationTitle} · {recommendationMeal.code}</DialogTitle>
              <DialogDescription>{t.recommendationDescription}</DialogDescription>
            </DialogHeader>
            <div className="nutrition-recommendation-grid">
              <div>
                <span>{t.dietitianEnergy}</span>
                <strong>{kcalTargets[recommendationMeal.id] ? `${kcalTargets[recommendationMeal.id]} kcal/${t.perServing}` : "—"}</strong>
              </div>
              {nutrients.map((item) => {
                const low = recommendationMeal.thresholds?.[item.min];
                const high = recommendationMeal.thresholds?.[item.max];
                return (
                  <div key={item.key}>
                    <span>{item.label}</span>
                    <strong>{typeof low !== "number" && typeof high !== "number" ? "—" : `${typeof low === "number" ? number.format(low) : "—"}–${typeof high === "number" ? number.format(high) : "—"} ${item.unit}`}</strong>
                  </div>
                );
              })}
            </div>
            <label className="nutrition-patient-note">
              {t.patientNote}
              <textarea
                value={patientNotes[recommendationMeal.id] ?? ""}
                onChange={(event) =>
                  setPatientNotes((current) => ({
                    ...current,
                    [recommendationMeal.id]: event.target.value,
                  }))
                }
                maxLength={500}
                disabled={recommendationMeal.approved}
                placeholder={t.patientNotePlaceholder}
              />
              <small>{t.patientNoteHelp}</small>
            </label>
          </DialogContent>
        ) : null}
      </Dialog>
    </section>
  );
}
