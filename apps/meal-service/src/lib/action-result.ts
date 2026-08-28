export type ActionResult = {
  status: "idle" | "success" | "error";
  message: string;
};

export const INITIAL_ACTION_RESULT: ActionResult = { status: "idle", message: "" };

export function actionSuccess(message: string): ActionResult {
  return { status: "success", message };
}

export function actionFailure(error: unknown): ActionResult {
  return {
    status: "error",
    message: error instanceof Error && error.message.trim() ? error.message : "Không thể hoàn tất thao tác. Vui lòng thử lại.",
  };
}
