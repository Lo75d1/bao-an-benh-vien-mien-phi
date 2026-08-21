"use client";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/presentation";

export default function AppError({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <main className="workspace"><ErrorState description="Dữ liệu nghiệp vụ chưa thể hiển thị. Không có dữ liệu nào được thay đổi."/><Button className="mt-4" onClick={unstable_retry}>Thử tải lại</Button></main>;
}
