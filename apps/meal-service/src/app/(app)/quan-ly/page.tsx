import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ErrorState } from "@/components/presentation";
import { getSessionUser } from "@/lib/auth";
import { readManagementDay } from "@/lib/management";
import { ManagementBoard } from "./management-board";
import "./quan-ly.css";

export default async function ManagementPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (user.role !== "ADMIN") redirect("/");

  const [dayResult] = await Promise.allSettled([readManagementDay()]);
  return <AppShell user={user}><main className="management-page">
    {dayResult.status === "fulfilled"
      ? <ManagementBoard data={dayResult.value}/>
      : <section className="management-section-error"><ErrorState title="Chưa tải được bàn điều hành" description="Không thể đọc số suất và trạng thái khoa. Không có dữ liệu nào được thay đổi."/></section>}
  </main></AppShell>;
}
