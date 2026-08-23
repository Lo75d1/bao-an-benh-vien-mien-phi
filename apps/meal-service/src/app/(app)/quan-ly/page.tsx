import { Separator } from "@/components/ui/separator";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CurrentMealLifecycle } from "@/components/current-meal-lifecycle";
import { ErrorState } from "@/components/presentation";
import { getSessionUser } from "@/lib/auth";
import { readManagementDay } from "@/lib/management";
import { ManagementBoard } from "./management-board";

export default async function ManagementPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (user.role !== "ADMIN") redirect("/");

  const [dayResult] = await Promise.allSettled([readManagementDay()]);
  return <AppShell user={user}><main className="management-page"><Separator className="page-separator" aria-hidden="true"/>
    <CurrentMealLifecycle role={user.role}/>
    {dayResult.status === "fulfilled"
      ? <ManagementBoard data={dayResult.value}/>
      : <section className="management-section-error"><ErrorState title="Chưa tải được bàn điều hành" description="Không thể đọc số suất và trạng thái khoa. Không có dữ liệu nào được thay đổi."/></section>}
  </main></AppShell>;
}
