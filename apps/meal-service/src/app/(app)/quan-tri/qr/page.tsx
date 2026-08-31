import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readOperationalSettings } from "@/lib/settings";
import { PatientQrTool } from "../patient-qr-tool";

export default async function PatientQrPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (user.role !== "ADMIN") redirect("/");
  const [settings, departments] = await Promise.all([
    readOperationalSettings(),
    prisma.department.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true, publicToken: true } }),
  ]);
  return <AppShell user={user}><main className="workspace admin-page admin-workspace">
    <header className="admin-hero"><p className="eyebrow">Quản trị</p><h1>QR cho bệnh nhân/người nhà</h1><p>QR mở trang công khai của khoa trên Public URL bệnh viện đã cấu hình. Hệ thống không tạo QR nếu URL chưa hợp lệ.</p></header>
    <PatientQrTool publicBaseUrl={settings.publicBaseUrl} departments={departments.map((department) => ({ id: department.id, name: department.name, token: department.publicToken }))}/>
  </main></AppShell>;
}
