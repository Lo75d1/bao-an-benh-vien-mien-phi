"use client";
import { startTransition, useActionState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { ActionButton, ActionFeedback } from "@/components/action-feedback";
import { INITIAL_ACTION_RESULT, type ActionResult } from "@/lib/action-result";
import { getTranslations, readClientLocale } from "@/lib/locale";

const error = (id: string, message?: string) => message ? <span id={id} role="alert" className="field-error">{message}</span> : null;
type MealType = { id: string; name: string; cutoffTime: string; serviceTime: string; feedingRoute: "NORMAL" | "SONDE" };

export function SettingsForm({ settings, mealTypes, action }: { settings: Omit<SettingsFields, "reason">; mealTypes: MealType[]; action: (previous: ActionResult, data: FormData) => Promise<ActionResult> }) {
 const locale = readClientLocale(); const t = getTranslations(locale).management.adminForms; const roles = getTranslations(locale).role;
 const settingsSchema = z.object({ advanceEntryDays: z.number().int().min(1, t.minOneDay).max(60, t.maxSixtyDays), serviceCompletionMinutes: z.number().int().min(15, t.minFifteenMinutes).max(240, t.maxTwoFortyMinutes), publicMenuImages: z.boolean(), publicViewCountVisible: z.boolean(), foodRetention24hRequired: z.boolean(), sondeEnabled: z.boolean(), warehouseMode: z.enum(["A", "B"]), warehouseApprovalRole: z.enum(["ADMIN", "DIETITIAN", "KITCHEN"]), reason: z.string().trim().min(3, t.reasonMin).max(500) });
 const operationalSettingsSchema = settingsSchema.extend({ dataStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t.dataStartRequired) });
 type SettingsFields = z.infer<typeof operationalSettingsSchema>;
 const [result, formAction, pending] = useActionState(action, INITIAL_ACTION_RESULT); const { register, handleSubmit, control, formState: { errors } } = useForm<SettingsFields>({ resolver: zodResolver(operationalSettingsSchema), shouldFocusError: true, defaultValues: { ...settings, reason: "" } });
 const sondeEnabled = useWatch({ control, name: "sondeEnabled" });
 return <form onSubmit={handleSubmit((values, event) => { const form = event?.target; if (form instanceof HTMLFormElement) { const data = new FormData(form); for (const key of ["sondeEnabled", "publicMenuImages", "publicViewCountVisible", "foodRetention24hRequired"] as const) data.set(key, values[key] ? "true" : "false"); startTransition(() => formAction(data)); } })} noValidate className="admin-form settings-form"><div className="admin-grid settings-primary-grid">
  <label htmlFor="dataStartDate">{t.dataStartDate}<input id="dataStartDate" type="date" {...register("dataStartDate")}/><small>{t.dataStartHelp}</small></label>
  <label htmlFor="advanceEntryDays">{t.advanceEntryDays}<input id="advanceEntryDays" type="number" min="1" max="60" {...register("advanceEntryDays", { valueAsNumber: true })} aria-invalid={!!errors.advanceEntryDays} aria-describedby={errors.advanceEntryDays ? "advanceEntryDays-error" : undefined}/>{error("advanceEntryDays-error", errors.advanceEntryDays?.message)}</label>
  <label htmlFor="serviceCompletionMinutes">{t.serviceCompletionMinutes}<input id="serviceCompletionMinutes" type="number" min="15" max="240" step="5" {...register("serviceCompletionMinutes", { valueAsNumber: true })} aria-invalid={!!errors.serviceCompletionMinutes}/></label>
  <label className="check-field sonde-setting-control"><input type="checkbox" {...register("sondeEnabled")}/><span>{t.enableSonde}<small className={sondeEnabled ? "sonde-inline-state is-on" : "sonde-inline-state is-off"}>{sondeEnabled ? t.sondeOn : t.sondeOff}</small></span></label>
  <label className="check-field"><input type="checkbox" {...register("publicMenuImages")}/><span>{t.publicMenuImages}</span></label>
  <label className="check-field"><input type="checkbox" {...register("publicViewCountVisible")}/><span>{t.publicViewCountVisible}</span></label>
  <label className="check-field"><input type="checkbox" {...register("foodRetention24hRequired")}/><span>{t.foodRetention24hRequired}<small>{t.foodRetentionHelp}</small></span></label>
  <label htmlFor="warehouseMode">{t.warehouseMode}<select id="warehouseMode" {...register("warehouseMode")}><option value="A">{t.modeA}</option><option value="B">{t.modeB}</option></select></label>
  <label htmlFor="warehouseApprovalRole">{t.warehouseApprovalRole}<select id="warehouseApprovalRole" {...register("warehouseApprovalRole")}><option value="ADMIN">{roles.ADMIN}</option><option value="DIETITIAN">{roles.DIETITIAN}</option><option value="KITCHEN">{roles.KITCHEN}</option></select></label>
 </div><div className="meal-time-grid">{(["NORMAL", ...(sondeEnabled ? ["SONDE" as const] : [])] as const).map((route) => <section className="meal-schedule-settings" key={route}><header><strong>{route === "SONDE" ? t.sondeSchedule : t.normalSchedule}</strong><span>{t.mealCount.replace("{count}", String(mealTypes.filter((meal) => meal.feedingRoute === route).length))}</span></header><table><thead><tr><th>{t.mealName}</th><th>{t.cutoffTime}</th><th>{t.serviceTime}</th></tr></thead><tbody>{mealTypes.filter((meal) => meal.feedingRoute === route).map((meal) => <tr key={meal.id}><th>{meal.name}<input type="hidden" name="mealTypeId" value={meal.id}/></th><td><input aria-label={t.cutoffFor.replace("{meal}", meal.name)} name="cutoffTime" type="time" defaultValue={meal.cutoffTime} required/></td><td><input aria-label={t.serviceFor.replace("{meal}", meal.name)} name="serviceTime" type="time" defaultValue={meal.serviceTime} required/></td></tr>)}</tbody></table></section>)}</div>
 <div className="admin-submit"><label htmlFor="settings-reason">{t.changeReason}<input id="settings-reason" {...register("reason")} autoComplete="off" aria-invalid={!!errors.reason} aria-describedby={errors.reason ? "settings-reason-error" : undefined} placeholder={t.reasonPlaceholder}/>{error("settings-reason-error", errors.reason?.message)}</label><div><ActionButton type="submit" className="primary-action" pending={pending} pendingLabel={t.applying}>{t.applySettings}</ActionButton><ActionFeedback result={result}/></div></div></form>;
}

type SettingsFields = { dataStartDate: string; advanceEntryDays: number; serviceCompletionMinutes: number; publicMenuImages: boolean; publicViewCountVisible: boolean; foodRetention24hRequired: boolean; sondeEnabled: boolean; warehouseMode: "A" | "B"; warehouseApprovalRole: "ADMIN" | "DIETITIAN" | "KITCHEN"; reason: string };

export function AccountCreateForm({ departments, action }: { departments: { id: string; name: string }[]; action: (data: FormData) => Promise<void> }) {
 const locale = readClientLocale(); const t = getTranslations(locale).management.adminForms; const roles = getTranslations(locale).role;
 const accountSchema = z.object({ displayName: z.string().trim().min(2, t.fullNameMin).max(100), email: z.string().trim().email(t.validEmail), role: z.enum(["ADMIN", "DIETITIAN", "NURSE", "KITCHEN"]), departmentId: z.string(), password: z.string().min(10, t.passwordMin).max(256) }).superRefine((value, context) => { if (value.role === "NURSE" && !value.departmentId) context.addIssue({ code: "custom", path: ["departmentId"], message: t.chooseNurseDepartment }); });
 const scopedAccountSchema = accountSchema.and(z.object({ kitchenRoute: z.string() })).superRefine((value, context) => { if (value.role === "KITCHEN" && !["NORMAL", "SONDE"].includes(value.kitchenRoute)) context.addIssue({ code: "custom", path: ["kitchenRoute"], message: t.chooseKitchenScope }); });
 type AccountFields = z.infer<typeof scopedAccountSchema>;
 const [pending, run] = useTransition(); const { register, handleSubmit, formState: { errors } } = useForm<AccountFields>({ resolver: zodResolver(scopedAccountSchema), shouldFocusError: true, defaultValues: { displayName: "", email: "", role: "NURSE", departmentId: "", kitchenRoute: "", password: "" } });
 return <form onSubmit={handleSubmit((_values, event) => { const form = event?.target; if (form instanceof HTMLFormElement) { const data = new FormData(form); startTransition(() => run(() => action(data))); } })} noValidate className="admin-grid account-create">
  <label>{t.fullName}<input {...register("displayName")} autoComplete="name" aria-invalid={!!errors.displayName} aria-describedby={errors.displayName ? "account-name-error" : undefined}/>{error("account-name-error", errors.displayName?.message)}</label>
  <label>Email<input type="email" {...register("email")} autoComplete="email" spellCheck={false} aria-invalid={!!errors.email} aria-describedby={errors.email ? "account-email-error" : undefined}/>{error("account-email-error", errors.email?.message)}</label>
  <label>{t.role}<select {...register("role")}><option value="ADMIN">{roles.ADMIN}</option><option value="DIETITIAN">{roles.DIETITIAN}</option><option value="NURSE">{roles.NURSE}</option><option value="KITCHEN">{roles.KITCHEN}</option></select></label>
  <label>{t.departmentForNurse}<select {...register("departmentId")} aria-invalid={!!errors.departmentId} aria-describedby={errors.departmentId ? "account-department-error" : undefined}><option value="">-</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{error("account-department-error", errors.departmentId?.message)}</label>
  <label>{t.kitchenAccountScope}<select {...register("kitchenRoute")} aria-invalid={!!errors.kitchenRoute}><option value="">-</option><option value="NORMAL">{t.normalKitchen}</option><option value="SONDE">{t.sondeKitchen}</option></select>{error("account-kitchen-route-error", errors.kitchenRoute?.message)}</label>
  <label>{t.initialPassword}<input type="password" {...register("password")} autoComplete="new-password" aria-invalid={!!errors.password} aria-describedby={errors.password ? "account-password-error" : undefined}/>{error("account-password-error", errors.password?.message)}</label>
  <button className="primary-action" disabled={pending}>{pending ? t.creating : t.createAccount}</button>
 </form>;
}
