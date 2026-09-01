"use client";

import {
  startTransition,
  useActionState,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  ClipboardCheck,
  Plus,
  Utensils,
} from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ActionButton, ActionFeedback } from "@/components/action-feedback";
import { INITIAL_ACTION_RESULT, type ActionResult } from "@/lib/action-result";
import { getTranslations, readClientLocale } from "@/lib/locale";

type Fields = z.infer<ReturnType<typeof buildSchema>>;
const number = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

function buildSchema(quantityInvalid: string) {
  return z.object({
    lines: z.array(
      z.object({
        dietTypeId: z.string(),
        name: z.string(),
        code: z.string(),
        route: z.string(),
        quantity: z.string().regex(/^\d+$/, quantityInvalid),
        internalNote: z.string().max(500),
        patientVisibleNote: z.string().max(500),
        previousQuantity: z.number().nullable(),
        menuItems: z.array(
          z.object({
            dishName: z.string(),
            name: z.string(),
            grams: z.number().nullable(),
          }),
        ),
        criteria: z.array(
          z.object({
            label: z.string(),
            status: z.string(),
            actual: z.number().nullable(),
            target: z.string(),
          }),
        ),
      }),
    ),
  });
}

export function ServingForm({
  route,
  mealEventId,
  departmentName,
  submitted,
  submittedByName,
  canEdit,
  canAddLate,
  lines,
  notesTrigger,
  lateAdditionTrigger,
  deliveryReceiptTrigger,
  action,
}: {
  route: "NORMAL" | "SONDE";
  mealEventId: string;
  departmentName: string;
  submitted: boolean;
  submittedByName: string | null;
  canEdit: boolean;
  canAddLate: boolean;
  lines: Fields["lines"];
  notesTrigger?: ReactNode;
  lateAdditionTrigger?: ReactNode;
  deliveryReceiptTrigger?: ReactNode;
  action: (previous: ActionResult, data: FormData) => Promise<ActionResult>;
}) {
  const [locale] = useState(() => readClientLocale());
  const t = getTranslations(locale).management.baoSuatForm;
  const schema = useMemo(() => buildSchema(t.quantityInvalid), [t.quantityInvalid]);
  const [result, formAction, pending] = useActionState(
    action,
    INITIAL_ACTION_RESULT,
  );
  const [editing, setEditing] = useState(!submitted);
  const [selected, setSelected] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<Fields>({
    resolver: zodResolver(schema),
    shouldFocusError: true,
    defaultValues: { lines },
  });
  const values = useWatch({ control, name: "lines" });
  const editable = canEdit && editing && result.status !== "success";
  const active = values[selected] ?? values[0];
  const total = values.reduce(
    (sum, line) => sum + (Number.parseInt(line.quantity, 10) || 0),
    0,
  );
  const changed = values.filter(
    (line) =>
      (Number.parseInt(line.quantity, 10) || 0) !==
      (line.previousQuantity ?? 0),
  ).length;
  const visible = useMemo(
    () =>
      showAll
        ? lines.map((_, index) => index)
        : lines
            .map((line, index) => ({ line, index }))
            .filter(
              ({ line }) =>
                Number(line.quantity) > 0 || line.previousQuantity !== null,
            )
            .map(({ index }) => index),
    [lines, showAll],
  );
  const submit = handleSubmit((formValues, event) => {
    const form = event?.target;
    if (!(form instanceof HTMLFormElement)) return;
    const data = new FormData(form);
    data.set("mealEventId", mealEventId);
    data.set("route", route);
    formValues.lines.forEach((line) => {
      data.append("dietTypeId", line.dietTypeId);
      data.set(`quantity:${line.dietTypeId}`, line.quantity);
      data.set(`internalNote:${line.dietTypeId}`, line.internalNote);
      data.set(`patientVisibleNote:${line.dietTypeId}`, line.patientVisibleNote);
    });
    startTransition(() => formAction(data));
  });

  return (
    <form
      id="nurse-serving-form"
      onSubmit={submit}
      noValidate
      className={`nurse-serving-workspace${editable ? "" : " is-locked"}`}
    >
      <section className="nurse-serving-master">
        <header className="nurse-serving-head">
          <div>
            <span>{t.wardLabel}</span>
            <strong>{departmentName}</strong>
          </div>
          <div className="nurse-head-actions">
            {notesTrigger}
            <span>{t.visibleCount.replace("{visible}", String(visible.length)).replace("{total}", String(lines.length))}</span>
            <b>{t.totalServingCount.replace("{count}", number.format(total))}</b>
          </div>
        </header>
        <div className="nurse-serving-table-scroll">
          <table className="nurse-serving-table">
            <thead>
              <tr>
                <th>{t.dietCode}</th>
                <th>{t.previousMeal}</th>
                <th>{t.currentMeal}</th>
                <th>{t.change}</th>
                <th>
                  <span className="sr-only">{t.details}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((index) => {
                const line = values[index];
                const current = Number.parseInt(line.quantity, 10) || 0;
                const previous = line.previousQuantity;
                const delta = previous === null ? null : current - previous;
                return (
                  <tr
                    key={line.dietTypeId}
                    className={selected === index ? "selected" : ""}
                    onClick={() => setSelected(index)}
                  >
                    <th scope="row">
                      <button type="button" onClick={() => setSelected(index)}>
                        <strong translate="no">{line.code}</strong>
                        <small>{line.name}</small>
                      </button>
                    </th>
                    <td className="numeric">{previous ?? "—"}</td>
                    <td>
                      <label>
                        <span className="sr-only">{t.totalServingCount.replace("{count}", line.name)}</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          disabled={!editable}
                          {...register(`lines.${index}.quantity`)}
                          onFocus={() => setSelected(index)}
                          aria-invalid={!!errors.lines?.[index]?.quantity}
                        />
                      </label>
                    </td>
                    <td>
                      {delta === null ? (
                        <span className="trend neutral">
                          <ArrowRight />
                          —
                        </span>
                      ) : delta > 0 ? (
                        <span className="trend up">
                          <ArrowUp />+{delta}
                        </span>
                      ) : delta < 0 ? (
                        <span className="trend down">
                          <ArrowDown />
                          {delta}
                        </span>
                      ) : (
                        <span className="trend neutral">
                          <ArrowRight />
                          0
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="row-more"
                        aria-label={t.openDetails.replace("{code}", line.code)}
                        onClick={() => setSelected(index)}
                      >
                        •••
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">{t.totalTitle}</th>
                <td>
                  {lines.reduce(
                    (sum, line) => sum + (line.previousQuantity ?? 0),
                    0,
                  ) || "—"}
                </td>
                <td>{total || "—"}</td>
                <td>{changed ? t.changedCount.replace("{count}", String(changed)) : t.noChange}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        <footer className="nurse-serving-footer">
          {editable ? (
            <>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowAll((value) => !value)}
              >
                <Plus aria-hidden="true" />
                {showAll ? t.hideUnusedCodes : t.addDietCode}
              </button>
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="primary-action"
                    disabled={pending}
                  >
                    <ClipboardCheck aria-hidden="true" />
                    {submitted ? t.updateReport : t.submitReport}
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      {submitted ? t.updateTitle : t.submitTitle}
                    </DialogTitle>
                    <DialogDescription>{t.submitDescription}</DialogDescription>
                  </DialogHeader>
                  <div className="nurse-confirm-summary">
                    <span>{t.summaryTitle}</span>
                    <strong>{number.format(total)} {t.servingCount}</strong>
                    <small>
                      {changed
                        ? t.comparedToPrevious.replace("{count}", String(changed))
                        : t.keepPrevious}
                    </small>
                  </div>
                  <label className="nurse-reporter-name">
                    {t.reporterLabel}
                    <input
                      form="nurse-serving-form"
                      name="reportedByName"
                      minLength={2}
                      maxLength={100}
                      autoComplete="name"
                      required
                      defaultValue={submittedByName ?? ""}
                      placeholder={t.reporterPlaceholder}
                    />
                  </label>
                  <ActionButton
                    form="nurse-serving-form"
                    type="submit"
                    className="primary-action"
                    pending={pending}
                    pendingLabel={t.sending}
                  >
                    {submitted ? t.updateToKitchen : t.sendToKitchen}
                  </ActionButton>
                  <ActionFeedback result={result} actionId="serving-report" />
                </DialogContent>
              </Dialog>
            </>
          ) : submitted && canEdit ? (
            <>
              <span className="nurse-submitted-state">
                <Check aria-hidden="true" />
                {t.submittedState}
                {submittedByName ? ` · ${submittedByName}` : ""}
              </span>
              <button
                type="button"
                className="primary-action"
                onClick={() => setEditing(true)}
              >
                {t.edit}
              </button>
            </>
          ) : null}
          {!editable ? <ActionFeedback result={result} actionId="serving-report" /> : null}
        </footer>
      </section>
      <aside className="nurse-serving-detail">
        {active ? (
          <>
            <header>
              <span>{t.mealDetail}</span>
              <h2>
                <span translate="no">{active.code}</span> · {active.name}
              </h2>
              <strong>{active.quantity || "—"} {t.servingCount}</strong>
            </header>
            <section className="floating-block">
              <h3>
                <Utensils aria-hidden="true" />
                {t.menuTitle}
              </h3>
              {active.menuItems.length ? (
                <table>
                  <thead>
                    <tr>
                      <th>{t.dish}</th>
                      <th>{t.foodItem}</th>
                      <th>{t.portion}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.menuItems.map((item, index) => (
                      <tr key={`${item.name}-${index}`}>
                        <td>{item.dishName}</td>
                        <td>{item.name}</td>
                        <td>
                          {item.grams === null
                            ? "—"
                            : `${number.format(item.grams)} g`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>{t.noMenu}</p>
              )}
            </section>
            <section className="floating-block">
              <h3>
                <Check aria-hidden="true" />
                {t.criteriaTitle}
              </h3>
              {active.criteria.length ? (
                <table>
                  <thead>
                    <tr>
                      <th>{t.criterion}</th>
                      <th>{t.result}</th>
                      <th>{t.compare}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.criteria.map((item, index) => (
                      <tr key={`${item.label}-${index}`}>
                        <td>{item.label}</td>
                        <td>
                          {item.actual === null
                            ? "—"
                            : number.format(item.actual)}
                        </td>
                        <td>
                          {item.status === "MISSING"
                            ? "—"
                            : `${item.status} · ${item.target}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>{t.noCriteria}</p>
              )}
            </section>
            <section className="floating-block nurse-code-notes">
              <h3>{t.kitchenNotesTitle}</h3>
              <input
                type="hidden"
                {...register(`lines.${selected}.internalNote`)}
              />
              <label>
                {t.kitchenNotesLabel}
                <textarea
                  disabled={!editable}
                  {...register(`lines.${selected}.patientVisibleNote`)}
                  placeholder={t.kitchenNotesPlaceholder}
                />
              </label>
            </section>
          </>
        ) : (
          <div className="nurse-detail-empty">
            <Utensils />
            <h2>{t.chooseDietCode}</h2>
            <p>{t.detailHint}</p>
          </div>
        )}
      </aside>
      {canAddLate ? (
        <div className="nurse-locked-overlay">
          <div>
            {deliveryReceiptTrigger ? (
              <>
                <strong>{t.handoffTitle}</strong>
                <span>{t.handoffDescription}</span>
                <div className="nurse-service-primary">
                  {deliveryReceiptTrigger}
                </div>
                <details className="nurse-late-exception">
                  <summary>{t.lateSummaryTitle}</summary>
                  <p>{t.lateSummaryDescription}</p>
                  {lateAdditionTrigger}
                </details>
              </>
            ) : (
              <>
                <strong>{t.lateSummaryTitle}</strong>
                <span>{t.lateSummaryDescription}</span>
                <div className="nurse-locked-actions">
                  {lateAdditionTrigger}
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </form>
  );
}
