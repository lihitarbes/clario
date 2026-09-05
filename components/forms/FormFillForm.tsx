"use client";

import { useActionState, useMemo, useState } from "react";
import { submitFormAssignmentAction } from "@/actions/forms";
import { ActionPendingLabel } from "@/components/ui/action-pending-label";
import {
  FormContentInput,
  FormContentTextarea,
  FormContentText,
} from "@/components/forms/FormContentFields";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { clearHiddenFormAnswers, isFormFieldVisible } from "@/lib/forms/visibility";
import { yesNoDisplayLabels } from "@/lib/forms/render";
import { validateFormAnswers } from "@/lib/validation/form-answers";
import type { FormAnswersMap } from "@/lib/forms/visibility";
import type { Form, FormFieldDefinition } from "@/types/database";

type FormFillFormProps = {
  assignmentId: string;
  form: Pick<Form, "title" | "description" | "fields">;
  /** Prefill from a prior submission (update flows). */
  initialAnswers?: FormAnswersMap;
  /** Optional banner when this fill is an update. */
  updateBanner?: string | null;
};

export function FormFillForm({
  assignmentId,
  form,
  initialAnswers = {},
  updateBanner = null,
}: FormFillFormProps) {
  const [state, formAction, pending] = useActionState(
    submitFormAssignmentAction,
    null,
  );
  const [answers, setAnswers] = useState<FormAnswersMap>(initialAnswers);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const yesNoLabels = yesNoDisplayLabels(
    `${form.title} ${form.description ?? ""}`,
  );

  const visibleFields = useMemo(() => {
    const cleaned = clearHiddenFormAnswers(form.fields, answers);
    return form.fields.filter((field) => isFormFieldVisible(field, cleaned));
  }, [form.fields, answers]);

  const answersJson = JSON.stringify(
    clearHiddenFormAnswers(form.fields, answers),
  );

  function updateAnswer(questionId: string, value: unknown) {
    setAnswers((current) =>
      clearHiddenFormAnswers(form.fields, {
        ...current,
        [questionId]: value,
      }),
    );
    setFieldErrors((current) => {
      if (!current[questionId]) {
        return current;
      }
      const next = { ...current };
      delete next[questionId];
      return next;
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const validation = validateFormAnswers(form.fields, answers);
    if (!validation.ok) {
      event.preventDefault();
      setFieldErrors(validation.errors);
      return;
    }

    setFieldErrors({});
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-6">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <input type="hidden" name="answersJson" value={answersJson} readOnly />

      {updateBanner ? (
        <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
          {updateBanner}
        </p>
      ) : null}

      <div className="space-y-1">
        <FormContentText as="h2" className="text-lg font-semibold text-zinc-900">
          {form.title}
        </FormContentText>
        {form.description ? (
          <FormContentText className="text-sm text-zinc-600">
            {form.description}
          </FormContentText>
        ) : null}
      </div>

      <div className="space-y-6">
        {visibleFields.map((field) => (
          <FieldInput
            key={field.id}
            field={field}
            value={answers[field.id]}
            error={fieldErrors[field.id]}
            yesNoLabels={yesNoLabels}
            disabled={pending}
            onChange={(value) => updateAnswer(field.id, value)}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          <ActionPendingLabel
            pending={pending}
            pendingLabel="Submitting…"
            idleLabel="Submit form"
          />
        </Button>
        {state && !state.success ? (
          <p className="text-sm text-red-600" role="alert">{state.error}</p>
        ) : null}
      </div>
    </form>
  );
}

type FieldInputProps = {
  field: FormFieldDefinition;
  value: unknown;
  error?: string;
  yesNoLabels: { yes: string; no: string };
  disabled?: boolean;
  onChange: (value: unknown) => void;
};

function FieldInput({
  field,
  value,
  error,
  yesNoLabels,
  disabled = false,
  onChange,
}: FieldInputProps) {
  if (field.type === "checkbox") {
    return (
      <div className="space-y-2 rounded-lg border border-zinc-200 bg-white p-4">
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={value === true}
            disabled={disabled}
            onChange={(event) => onChange(event.target.checked)}
            className="mt-0.5"
          />
          <span>
            <FormContentText>{field.label}</FormContentText>
            {field.required ? (
              <span className="text-red-600" aria-hidden="true"> *</span>
            ) : null}
          </span>
        </label>
        {field.helpText ? (
          <FormContentText className="text-sm text-zinc-600">
            {field.helpText}
          </FormContentText>
        ) : null}
        {error ? (
          <p className="text-sm text-red-600" role="alert">{error}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-zinc-200 bg-white p-4">
      <div className="space-y-1">
        <Label className="font-medium text-zinc-900">
          <FormContentText>{field.label}</FormContentText>
          {field.required ? (
            <span className="text-red-600" aria-hidden="true"> *</span>
          ) : null}
        </Label>
        {field.helpText ? (
          <FormContentText className="text-sm text-zinc-600">
            {field.helpText}
          </FormContentText>
        ) : null}
      </div>

      {field.type === "short_text" ? (
        <FormContentInput
          value={typeof value === "string" ? value : ""}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : null}

      {field.type === "long_text" ? (
        <FormContentTextarea
          value={typeof value === "string" ? value : ""}
          disabled={disabled}
          rows={4}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : null}

      {field.type === "yes_no" ? (
        <div className="flex flex-wrap gap-4">
          {(["yes", "no"] as const).map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`field-${field.id}`}
                value={option}
                checked={value === option}
                disabled={disabled}
                onChange={() => onChange(option)}
              />
              <FormContentText>
                {option === "yes" ? yesNoLabels.yes : yesNoLabels.no}
              </FormContentText>
            </label>
          ))}
        </div>
      ) : null}

      {field.type === "single_choice" && field.options ? (
        <div className="space-y-2">
          {field.options.map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`field-${field.id}`}
                value={option}
                checked={value === option}
                disabled={disabled}
                onChange={() => onChange(option)}
              />
              <FormContentText>{option}</FormContentText>
            </label>
          ))}
        </div>
      ) : null}

      {field.type === "multiple_choice" && field.options ? (
        <div className="space-y-2">
          {field.options.map((option) => {
            const selected = Array.isArray(value) ? value : [];
            const checked = selected.includes(option);

            return (
              <label key={option} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={(event) => {
                    const next = event.target.checked
                      ? [...selected, option]
                      : selected.filter((item) => item !== option);
                    onChange(next);
                  }}
                />
                <FormContentText>{option}</FormContentText>
              </label>
            );
          })}
        </div>
      ) : null}

      {field.type === "date" ? (
        <FormContentInput
          type="date"
          value={typeof value === "string" ? value : ""}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : null}

      {error ? (
        <p className="text-sm text-red-600" role="alert">{error}</p>
      ) : null}
    </div>
  );
}
