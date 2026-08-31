export type PublicLanguage = "vi" | "en";

export const PUBLIC_LANGUAGES: PublicLanguage[] = ["vi", "en"];

export function resolvePublicLanguage(value: unknown): PublicLanguage {
  return value === "en" ? "en" : "vi";
}

export const PUBLIC_I18N = {
  vi: {
    appName: "Suất ăn bệnh viện",
    patient: "Bệnh nhân",
    nurse: "Điều dưỡng",
    dietitian: "Dinh dưỡng",
    kitchen: "Bếp",
    sonde: "Sonde",
    admin: "Admin",
    staffLogin: "Đăng nhập nhân viên",
    staffLoginTitle: "Đăng nhập nhân viên",
    staffLoginDescription: "Dùng tài khoản do bệnh viện cấp để vào khu vực làm việc.",
    patientNav: "Điều hướng trang bệnh nhân",
    menu: "Thực đơn",
    meals: "Suất ăn",
    noteFeedback: "Ghi chú / phản ánh",
    publicMenuEyebrow: "Thực đơn dành cho người bệnh",
    publicMenuTitle: "Xem thực đơn theo chế độ ăn",
    publicMenuDescription: "Chọn mã chế độ ăn và ngày. Hệ thống chỉ hiển thị thực đơn đã được dinh dưỡng lưu.",
    dietCode: "Mã chế độ ăn",
    byTube: "Qua sonde",
    viewDate: "Ngày xem",
    viewMenu: "Xem thực đơn",
    advanceWindow: "Xem trước tối đa {days} ngày theo cấu hình bệnh viện.",
    currentMeal: "Suất hiện tại",
    nextMeal: "Suất kế tiếp",
    noCurrentMeal: "Chưa đến suất đầu tiên trong ngày.",
    noDishName: "Chưa có tên món",
    noNextMeal: "Chưa có thực đơn kế tiếp trong cửa sổ công khai.",
    savedMenu: "Thực đơn đã lưu",
    noDietCode: "Chưa có mã chế độ ăn",
    noMenuTitle: "Chưa có thực đơn cho lựa chọn này",
    noMenuDescription: "Vui lòng chọn ngày khác hoặc liên hệ khoa điều trị.",
    noPhoto: "Chưa có ảnh",
    noDishData: "Chưa có dữ liệu món ăn.",
    dietitianNote: "Ghi chú từ dinh dưỡng",
    sendToRecipients: "Gửi tới khoa điều trị / quản trị",
    sendNoteFeedback: "Gửi ghi chú / phản ánh",
    noteFeedbackHelp: "Nội dung này sẽ được gửi đến Khoa điều trị và Quản trị hệ thống. Ghi chú bữa ăn chỉ chuyển tới bếp sau khi được khoa hoặc Admin kiểm tra; không nhập thông tin bệnh án.",
    submitted: "Đã gửi nội dung. Khoa điều trị và Quản trị hệ thống sẽ xem xét.",
    rateLimited: "Bạn đã gửi quá nhiều nội dung. Vui lòng thử lại sau.",
    invalidNote: "Nội dung cần từ 3 đến 500 ký tự.",
    submitFailed: "Chưa thể gửi nội dung lúc này. Vui lòng thử lại sau.",
    chooseSubmissionType: "Chọn loại nội dung",
    mealNote: "Ghi chú bữa ăn",
    feedback: "Phản ánh",
    department: "Khoa điều trị",
    chooseDepartment: "Chọn tên khoa",
    content: "Nội dung",
    required: "bắt buộc",
    optional: "không bắt buộc",
    notePlaceholder: "Ví dụ: Xin lưu ý món ăn cần mềm hơn hoặc phản ánh về bữa ăn…",
    senderName: "Tên người gửi",
    contactInfo: "Thông tin liên hệ",
    contactPlaceholder: "Số điện thoại hoặc buồng/phòng nếu muốn khoa phản hồi",
    submitContent: "Gửi nội dung",
    noteUnavailable: "— · Bệnh viện chưa mở khoa nhận nội dung công khai.",
    publicFooter: "Thông tin thực đơn chung · Không thay thế chỉ định điều trị",
    views: "{count} lượt xem",
    languageLabel: "Ngôn ngữ",
    demoNurse: "Vào demo Điều dưỡng",
    demoDietitian: "Vào demo Dinh dưỡng",
    demoKitchen: "Vào demo Bếp ăn thường",
    demoSonde: "Vào demo Bếp Sonde",
    demoAdmin: "Vào demo quản trị",
  },
  en: {
    appName: "Hospital Meal Service",
    patient: "Patient",
    nurse: "Nurse",
    dietitian: "Dietitian",
    kitchen: "Kitchen",
    sonde: "Tube Feeding",
    admin: "Admin",
    staffLogin: "Staff sign in",
    staffLoginTitle: "Staff sign in",
    staffLoginDescription: "Use the account provided by the hospital to access the staff workspace.",
    patientNav: "Patient page navigation",
    menu: "Menu",
    meals: "Meals",
    noteFeedback: "Note / feedback",
    publicMenuEyebrow: "Menu for patients",
    publicMenuTitle: "View menu by diet code",
    publicMenuDescription: "Choose a diet code and date. The system only shows menus saved by the nutrition team.",
    dietCode: "Diet code",
    byTube: "Tube feeding",
    viewDate: "Date",
    viewMenu: "View menu",
    advanceWindow: "Preview up to {days} days according to hospital settings.",
    currentMeal: "Current meal",
    nextMeal: "Next meal",
    noCurrentMeal: "The first meal of the day has not started yet.",
    noDishName: "No dish name yet",
    noNextMeal: "No next menu is available in the public window.",
    savedMenu: "Saved menu",
    noDietCode: "No diet code available",
    noMenuTitle: "No menu for this selection",
    noMenuDescription: "Please choose another date or contact the ward.",
    noPhoto: "No photo yet",
    noDishData: "No dish data yet.",
    dietitianNote: "Note from nutrition team",
    sendToRecipients: "Sent to ward / admin",
    sendNoteFeedback: "Send a Note / Feedback",
    noteFeedbackHelp: "This content will be sent to the ward and system admin. Meal notes are only forwarded to the kitchen after the ward or Admin reviews them; do not enter medical record information.",
    submitted: "Submitted successfully. The ward and system admin will review it.",
    rateLimited: "You have sent too many submissions. Please try again later.",
    invalidNote: "Content must be between 3 and 500 characters.",
    submitFailed: "Unable to submit right now. Please try again later.",
    chooseSubmissionType: "Choose content type",
    mealNote: "Meal Note",
    feedback: "Feedback",
    department: "Ward",
    chooseDepartment: "Choose ward",
    content: "Content",
    required: "required",
    optional: "optional",
    notePlaceholder: "Example: Please make the meal softer, or share feedback about the meal…",
    senderName: "Sender name",
    contactInfo: "Contact information",
    contactPlaceholder: "Phone number or room/bed if you want the ward to respond",
    submitContent: "Submit",
    noteUnavailable: "— · The hospital has not enabled public submissions for wards.",
    publicFooter: "General menu information · Not a substitute for medical orders",
    views: "{count} views",
    languageLabel: "Language",
    demoNurse: "Open Nurse demo",
    demoDietitian: "Open Dietitian demo",
    demoKitchen: "Open regular Kitchen demo",
    demoSonde: "Open Tube Feeding Kitchen demo",
    demoAdmin: "Open Admin demo",
  },
} as const;

export function publicT(language: PublicLanguage, key: keyof typeof PUBLIC_I18N.vi, vars: Record<string, string | number> = {}) {
  let text: string = PUBLIC_I18N[language][key] ?? PUBLIC_I18N.vi[key] ?? key;
  for (const [name, value] of Object.entries(vars)) text = text.replace(`{${name}}`, String(value));
  return text;
}

export function publicDateFormatter(language: PublicLanguage) {
  return new Intl.DateTimeFormat(language === "en" ? "en-US" : "vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
}

export function publicNumberFormatter(language: PublicLanguage, maximumFractionDigits = 1) {
  return new Intl.NumberFormat(language === "en" ? "en-US" : "vi-VN", { maximumFractionDigits });
}

export function publicMealTypeName(name: string, language: PublicLanguage) {
  if (language !== "en") return name;
  const normalized = name.trim().toLowerCase();
  if (normalized === "sáng" || normalized === "bữa sáng") return "Breakfast";
  if (normalized === "trưa" || normalized === "bữa trưa") return "Lunch";
  if (normalized === "chiều" || normalized === "bữa chiều") return "Afternoon Meal";
  if (normalized === "tối" || normalized === "bữa tối") return "Dinner";
  return name;
}
