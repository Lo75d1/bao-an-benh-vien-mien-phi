import { getSessionUser } from "./auth";
import { readBootstrapState } from "./bootstrap-setup";
import { readSetupCompletion } from "./first-time-setup";

export async function requireSetupHandoffAccess() {
  const completion = await readSetupCompletion();
  if (!completion) throw new Error("Hệ thống chưa hoàn tất khởi tạo.");
  const user = await getSessionUser({ allowPasswordChange: true });
  if (user?.role === "ADMIN") return;
  const bootstrap = await readBootstrapState();
  if (bootstrap?.adminId === completion.completedById) return;
  throw new Error("Không có quyền tải hồ sơ bàn giao.");
}
