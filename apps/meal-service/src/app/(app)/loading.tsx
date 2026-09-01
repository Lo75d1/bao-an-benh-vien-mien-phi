import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return <main className="workspace route-loading" aria-label="Đang tải / Loading"><div><Skeleton className="h-4 w-28"/><Skeleton className="mt-3 h-9 w-80 max-w-full"/></div><Skeleton className="h-16 w-full"/><Skeleton className="h-72 w-full"/></main>;
}
