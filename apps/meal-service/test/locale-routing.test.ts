import assert from "node:assert/strict";
import test from "node:test";
import { getTranslations } from "../src/lib/locale";
import { localeCookieSyncValue, localeFromSearchParam } from "../src/lib/locale-routing";
import { hrefWithLocale } from "../src/lib/locale-url";
import { workspaceHrefWithDemoTime } from "../src/lib/demo-workspace-url";

test("VI selected renders Vietnamese management page resources", () => {
  const t = getTranslations("vi").management;
  assert.equal(t.reportsPage.title, "Xem trước trước khi xuất dữ liệu chính xác");
  assert.equal(t.adminPage.title, "Cấu hình hệ thống để vận hành đúng");
  assert.equal(t.warehousePage.title, "Hóa đơn đã lưu");
});

test("VI selected renders Vietnamese demo workspace labels", () => {
  const t = getTranslations("vi").management;
  assert.equal(t.thucDonPage.excelImportTriggerLabel, "Nhập Excel");
  assert.equal(t.multiCodeMenuBoard.workflowEntryStep, "1 \u2014 Sửa thực đơn");
  assert.equal(t.multiCodeMenuBoard.copyMenuTrigger, "Sao chép từ ngày khác");
  assert.equal(t.multiCodeMenuBoard.addDish, "Thêm món");
  assert.equal(t.kitchenBoard.mainTitle, "Suất ăn & tiến độ");
  assert.equal(t.kitchenDialogs.additionsTrigger, "Suất bổ sung");
  assert.equal(t.brandingForm.systemColorTitle, "Màu hệ thống");
  assert.equal(t.brandingForm.publicHomeTitle, "Trang công khai");
});

test("EN selected renders English management page resources", () => {
  const t = getTranslations("en").management;
  assert.equal(t.reportsPage.title, "Preview before exporting exact data");
  assert.equal(t.adminPage.title, "Configure the system for correct operations");
  assert.equal(t.warehousePage.title, "Saved invoices");
});

test("locale query sync updates stale cookies and keeps refresh stable", () => {
  assert.equal(localeFromSearchParam("vi"), "vi");
  assert.equal(localeFromSearchParam("en"), "en");
  assert.equal(localeFromSearchParam("fr"), null);
  assert.equal(localeCookieSyncValue("vi", "en"), "vi");
  assert.equal(localeCookieSyncValue("vi", "vi"), null);
  assert.equal(localeCookieSyncValue(null, "vi"), null);
});

test("demo role switch hrefs preserve demo time without resetting locale", () => {
  const demoNow = "2026-08-29T11:00:00.000Z";
  assert.equal(workspaceHrefWithDemoTime("/kho", demoNow), `/kho?demoNow=${encodeURIComponent(demoNow)}`);
  assert.equal(workspaceHrefWithDemoTime("/quan-tri", demoNow), `/quan-tri?demoNow=${encodeURIComponent(demoNow)}`);
});

test("locale switch href preserves current route query and hash", () => {
  assert.equal(hrefWithLocale("/?patient=1&date=2026-09-02#public-menu-browser", "en"), "/?patient=1&date=2026-09-02&lang=en#public-menu-browser");
  assert.equal(hrefWithLocale("/thuc-don?meal=breakfast&demoNow=2026-09-02T01%3A00%3A00.000Z", "vi"), "/thuc-don?meal=breakfast&demoNow=2026-09-02T01%3A00%3A00.000Z&lang=vi");
});
