"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/presentation";
import type { Language } from "@/lib/i18n";

export default function AppError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const [language] = useState<Language>(() =>
    typeof document !== "undefined" && document.documentElement.lang === "en"
      ? "en"
      : "vi",
  );

  return (
    <main className="workspace">
      <ErrorState
        description={
          language === "en"
            ? "Business data cannot be displayed yet. No data was changed."
            : "Dữ liệu nghiệp vụ chưa thể hiển thị. Không có dữ liệu nào được thay đổi."
        }
      />
      <Button className="mt-4" onClick={unstable_retry}>
        {language === "en" ? "Try again" : "Thử tải lại"}
      </Button>
    </main>
  );
}
