import type { Language } from "@/lib/i18n";

export const PROFILE_TEXT = {
  vi: {
    roles: {
      ADMIN: "Quản trị",
      DIETITIAN: "Dinh dưỡng",
      NURSE: "Điều dưỡng",
      KITCHEN: "Nhà bếp",
    },
    firstTitle: "Hãy đổi mật khẩu trước khi bắt đầu làm việc.",
    firstHelp:
      "Đây là mật khẩu tạm do quản trị viên cấp. Sau khi đổi thành công, hệ thống sẽ mở các màn nghiệp vụ.",
    eyebrow: "Tài khoản cá nhân",
    title: "Hồ sơ của tôi",
    intro: "Xem thông tin được bệnh viện cấp và bảo vệ tài khoản bằng mật khẩu riêng.",
    profileTitle: "Thông tin hồ sơ",
    profileHelp: "Thông tin này chỉ có thể được thay đổi bởi quản trị viên.",
    name: "Họ và tên",
    email: "Email",
    role: "Vai trò",
    department: "Khoa",
    departmentWarning:
      "Thông tin khoa đang thiếu hoặc chưa đúng. Vui lòng liên hệ quản trị viên.",
    passwordTitle: "Đổi mật khẩu",
    passwordHelp:
      "Sau khi đổi, phiên hiện tại được giữ lại và các phiên đăng nhập khác sẽ bị đăng xuất.",
    currentPassword: "Mật khẩu hiện tại",
    newPassword: "Mật khẩu mới",
    confirmPassword: "Xác nhận mật khẩu mới",
    passwordHint:
      "Dùng từ 10 đến 256 ký tự và không trùng mật khẩu hiện tại.",
    changing: "Đang đổi mật khẩu...",
    changePassword: "Đổi mật khẩu",
    currentMin: "Mật khẩu hiện tại cần ít nhất 10 ký tự.",
    newMin: "Mật khẩu mới cần ít nhất 10 ký tự.",
    confirmMin: "Hãy nhập lại mật khẩu mới.",
    samePassword: "Mật khẩu mới phải khác mật khẩu hiện tại.",
    mismatch: "Mật khẩu xác nhận chưa khớp.",
    success:
      "Đã đổi mật khẩu. Các phiên đăng nhập khác đã được đăng xuất.",
    failure: "Không thể đổi mật khẩu lúc này. Vui lòng thử lại.",
    language: "Ngôn ngữ",
    languageHelp:
      "Lựa chọn được lưu theo tài khoản và giữ sau khi đăng xuất/đăng nhập lại.",
    saving: "Đang lưu...",
    saveLanguage: "Lưu ngôn ngữ",
  },
  en: {
    roles: {
      ADMIN: "Admin",
      DIETITIAN: "Dietitian",
      NURSE: "Nurse",
      KITCHEN: "Kitchen",
    },
    firstTitle: "Change your password before you begin.",
    firstHelp:
      "This is a temporary password issued by an administrator. Your workspaces will open after it is changed successfully.",
    eyebrow: "Personal account",
    title: "My profile",
    intro:
      "Review information provided by the hospital and protect your account with your own password.",
    profileTitle: "Profile information",
    profileHelp: "Only an administrator can change this information.",
    name: "Full name",
    email: "Email",
    role: "Role",
    department: "Department",
    departmentWarning:
      "The department assignment is missing or invalid. Please contact an administrator.",
    passwordTitle: "Change password",
    passwordHelp:
      "Your current session remains active after the change; all other sessions will be signed out.",
    currentPassword: "Current password",
    newPassword: "New password",
    confirmPassword: "Confirm new password",
    passwordHint:
      "Use 10 to 256 characters and choose a password different from the current one.",
    changing: "Changing password...",
    changePassword: "Change password",
    currentMin: "The current password must contain at least 10 characters.",
    newMin: "The new password must contain at least 10 characters.",
    confirmMin: "Enter the new password again.",
    samePassword: "The new password must differ from the current password.",
    mismatch: "The password confirmation does not match.",
    success: "Password changed. All other sessions have been signed out.",
    failure: "Unable to change the password right now. Please try again.",
    language: "Language",
    languageHelp:
      "This preference is saved to your account and remains in effect after signing out and back in.",
    saving: "Saving...",
    saveLanguage: "Save language",
  },
} as const satisfies Record<Language, object>;
