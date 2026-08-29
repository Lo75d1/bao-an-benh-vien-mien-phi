export const ROLE_WORKSPACE = {
  ADMIN: "/quan-ly",
  DIETITIAN: "/quan-ly",
  NURSE: "/bao-suat",
  KITCHEN: "/bep",
} as const;

export type WorkspaceRole = keyof typeof ROLE_WORKSPACE;

export function workspaceForRole(role: string | null | undefined): string {
  return role && role in ROLE_WORKSPACE ? ROLE_WORKSPACE[role as WorkspaceRole] : "/";
}
