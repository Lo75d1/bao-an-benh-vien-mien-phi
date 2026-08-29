import ExcelJS from "exceljs";
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import { prisma } from "./prisma";
import { readBrandingSettings } from "./branding";
import { readOperationalSettings } from "./settings";
import { readSetupCompletion } from "./first-time-setup";

export type TemporaryCredential = { userId: string; password: string };

export async function readSetupHandoffData() {
  const [branding, settings, completion, users, departments, meals, diets] = await Promise.all([
    readBrandingSettings(), readOperationalSettings(), readSetupCompletion(),
    prisma.user.findMany({ orderBy: [{ role: "asc" }, { displayName: "asc" }], include: { memberships: { include: { department: true } } } }),
    prisma.department.findMany({ orderBy: { code: "asc" }, include: { memberships: { where: { user: { role: "NURSE", status: "ACTIVE" } } } } }),
    prisma.mealType.findMany({ orderBy: [{ feedingRoute: "asc" }, { sortOrder: "asc" }] }),
    prisma.dietType.findMany({ orderBy: [{ feedingRoute: "asc" }, { sortOrder: "asc" }] }),
  ]);
  if (!completion) throw new Error("Hệ thống chưa hoàn tất khởi tạo.");
  return { branding, settings, completion, users, departments, meals, diets };
}

const roleLabel = { ADMIN: "Quản trị", DIETITIAN: "Dinh dưỡng", NURSE: "Điều dưỡng", KITCHEN: "Nhà bếp" } as const;
const statusLabel = (value: string) => value === "ACTIVE" ? "Đang hoạt động" : "Vô hiệu";
export function safeHandoffFilename(name: string, ext: string, date = new Date()) { return `${name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "benh-vien"}-${date.toISOString().slice(0, 10)}.${ext}`; }

export async function buildHandoffXlsx(data: Awaited<ReturnType<typeof readSetupHandoffData>>, temporary: TemporaryCredential[] = []) {
  const passwordByUser = new Map(temporary.map((item) => [item.userId, item.password]));
  const workbook = new ExcelJS.Workbook(); workbook.creator = "Hệ thống suất ăn bệnh viện"; workbook.created = new Date();
  const addSheet = (name: string, headers: string[]) => { const sheet = workbook.addWorksheet(name); sheet.addRow(headers); sheet.views = [{ state: "frozen", ySplit: 1 }]; sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } }; sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF153B5B" } }; sheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" }; sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } }; return sheet; };
  const accountHeaders = ["STT", "Họ tên", "Tên đăng nhập", "Vai trò", "Khoa/phòng", "NORMAL/Sonde", "Trạng thái", "Đổi mật khẩu lần đầu", ...(temporary.length ? ["Mật khẩu tạm (chỉ xuất lần này)"] : []), "Ghi chú"];
  const accounts = addSheet("TAI_KHOAN", accountHeaders);
  data.users.forEach((u, index) => accounts.addRow([index + 1, u.displayName, u.email, roleLabel[u.role], u.memberships.map((m) => m.department.name).join(", ") || "—", u.kitchenRoute ?? "—", statusLabel(u.status), u.mustChangePassword ? "Có" : "Không", ...(temporary.length ? [passwordByUser.get(u.id) ?? "—"] : []), u.role === "ADMIN" ? "Admin khởi tạo" : ""]));
  const departments = addSheet("KHOA_PHONG", ["Khoa/phòng", "Trạng thái", "Số tài khoản Điều dưỡng"]); data.departments.forEach((d) => departments.addRow([`${d.code} · ${d.name}`, statusLabel(d.status), d.memberships.length]));
  const meals = addSheet("BUA_AN", ["Route", "Tên bữa/cữ", "Giờ chốt", "Giờ phục vụ", "Trạng thái"]); data.meals.forEach((m) => meals.addRow([m.feedingRoute, m.name, m.cutoffTime, m.serviceTime, statusLabel(m.status)]));
  const diets = addSheet("CHE_DO_AN", ["Mã", "Tên", "Route", "Trạng thái"]); data.diets.forEach((d) => diets.addRow([d.code, d.name, d.feedingRoute, statusLabel(d.status)]));
  for (const sheet of workbook.worksheets) { sheet.columns.forEach((column) => { column.width = Math.min(42, Math.max(14, ...(column.values ?? []).map((value) => String(value ?? "").length + 2))); }); sheet.eachRow((row) => { row.alignment = { vertical: "top", wrapText: true }; }); }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

const cell = (text: string, bold = false) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, bold })] })] });
const table = (headers: string[], rows: string[][]) => new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ tableHeader: true, children: headers.map((h) => cell(h, true)) }), ...rows.map((row) => new TableRow({ children: row.map((value) => cell(value)) }))] });
export async function buildHandoffDocx(data: Awaited<ReturnType<typeof readSetupHandoffData>>, systemAddress: string) {
  const heading = (text: string) => new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 120 } });
  const doc = new Document({ sections: [{ properties: {}, children: [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "HỒ SƠ BÀN GIAO HỆ THỐNG", bold: true, size: 34, color: "153B5B" })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: data.branding.organizationName, bold: true, size: 26 })] }),
    new Paragraph({ text: `Địa chỉ hệ thống: ${systemAddress}` }), new Paragraph({ text: `Ngày khởi tạo: ${new Intl.DateTimeFormat("vi-VN").format(new Date(data.completion.completedAt))}` }),
    heading("1. Tài khoản và phân quyền"), table(["Họ tên", "Tên đăng nhập", "Vai trò", "Khoa/Bếp", "Trạng thái"], data.users.map((u) => [u.displayName, u.email, roleLabel[u.role], u.memberships.map((m) => m.department.name).join(", ") || u.kitchenRoute || "—", statusLabel(u.status)])),
    new Paragraph({ children: [new TextRun({ text: "Lưu ý: ", bold: true }), new TextRun("Mật khẩu không lưu trong hồ sơ này. Tài khoản dùng mật khẩu tạm phải đổi ở lần đăng nhập đầu.")] }),
    heading("2. Khoa/phòng"), table(["Mã", "Tên", "Trạng thái"], data.departments.map((d) => [d.code, d.name, statusLabel(d.status)])),
    heading("3. Đường nuôi và bữa/cữ"), new Paragraph({ text: `NORMAL: luôn bật · SONDE: ${data.settings.sondeEnabled ? "Đang bật" : "Không bật"}` }), table(["Route", "Bữa/cữ", "Giờ chốt", "Giờ phục vụ", "Trạng thái"], data.meals.map((m) => [m.feedingRoute, m.name, m.cutoffTime, m.serviceTime, statusLabel(m.status)])),
    heading("4. Chế độ ăn"), table(["Mã", "Tên", "Route", "Trạng thái"], data.diets.map((d) => [d.code, d.name, d.feedingRoute, statusLabel(d.status)])),
    heading("5. Hướng dẫn bàn giao"), new Paragraph({ text: "Nhân viên truy cập địa chỉ hệ thống, chọn Đăng nhập nhân viên, dùng tên đăng nhập được IT cấp và đổi mật khẩu ngay ở lần đăng nhập đầu." }),
    heading("6. Xác nhận bàn giao"), new Paragraph({ text: "ĐẠI DIỆN IT", spacing: { before: 240 } }), new Paragraph({ text: "Họ tên, chữ ký: __________________________________________" }), new Paragraph({ text: "ĐẠI DIỆN ĐƠN VỊ SỬ DỤNG", spacing: { before: 240 } }), new Paragraph({ text: "Họ tên, chức vụ, chữ ký: __________________________________" }),
  ] }] });
  return Buffer.from(await Packer.toBuffer(doc));
}
