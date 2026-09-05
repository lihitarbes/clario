"use client";

import { useActionState, useMemo, useState } from "react";
import { createFormAction, updateFormAction } from "@/actions/forms";
import { QuestionEditor } from "@/components/forms/QuestionEditor";
import {
  FormContentInput,
  FormContentTextarea,
} from "@/components/forms/FormContentFields";
import { RenewalSettingsFields } from "@/components/forms/RenewalSettingsFields";
import { ActionPendingLabel } from "@/components/ui/action-pending-label";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  createEmptyQuestion,
  reorderFormFields,
} from "@/lib/forms/fields";
import {
  renewalPresetFromMonths,
  type RenewalPreset,
} from "@/lib/forms/display";
import type { FormFieldDefinition } from "@/types/database";

type FormBuilderProps =
  | {
      mode: "create";
      initialTitle?: string;
      initialDescription?: string | null;
      initialRenewalMonths?: number | null;
      initialFields?: FormFieldDefinition[];
    }
  | {
      mode: "edit";
      formId: string;
      initialTitle: string;
      initialDescription: string | null;
      initialRenewalMonths: number | null;
      initialFields: FormFieldDefinition[];
      readOnly?: boolean;
    };

export function FormBuilder(props: FormBuilderProps) {
  const action =
    props.mode === "create" ? createFormAction : updateFormAction;
  const [state, formAction, pending] = useActionState(action, null);

  const readOnly = props.mode === "edit" && props.readOnly;

  const initialRenewal = renewalPresetFromMonths(
    props.initialRenewalMonths ?? null,
  );

  const [title, setTitle] = useState(props.initialTitle ?? "");
  const [description, setDescription] = useState(
    props.initialDescription ?? "",
  );
  const [renewalPreset, setRenewalPreset] = useState<RenewalPreset>(
    initialRenewal.preset,
  );
  const [customRenewalMonths, setCustomRenewalMonths] = useState<number | null>(
    initialRenewal.customMonths,
  );
  const [fields, setFields] = useState<FormFieldDefinition[]>(
    props.initialFields?.length
      ? reorderFormFields(props.initialFields)
      : [createEmptyQuestion(0)],
  );

  const fieldsJson = useMemo(
    () => JSON.stringify(reorderFormFields(fields)),
    [fields],
  );

  function moveField(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= fields.length) {
      return;
    }

    const next = [...fields];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setFields(reorderFormFields(next));
  }

  function updateField(index: number, field: FormFieldDefinition) {
    setFields((current) =>
      reorderFormFields(current.map((item, i) => (i === index ? field : item))),
    );
  }

  function removeField(index: number) {
    setFields((current) => {
      const next = current.filter((_, i) => i !== index);
      return next.length > 0
        ? reorderFormFields(next)
        : [createEmptyQuestion(0)];
    });
  }

  function addQuestion() {
    setFields((current) =>
      reorderFormFields([...current, createEmptyQuestion(current.length)]),
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {props.mode === "edit" ? (
        <input type="hidden" name="formId" value={props.formId} />
      ) : null}

      <input type="hidden" name="fieldsJson" value={fieldsJson} readOnly />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Form details</CardTitle>
          <CardDescription>
            Clients see this name when the form is assigned.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Form name</Label>
            <FormContentInput
              id="title"
              name="title"
              value={title}
              disabled={readOnly || pending}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <FormContentTextarea
              id="description"
              name="description"
              value={description}
              disabled={readOnly || pending}
              rows={3}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional context for your team or clients"
            />
          </div>

          <RenewalSettingsFields
            preset={renewalPreset}
            customMonths={customRenewalMonths}
            onPresetChange={setRenewalPreset}
            onCustomMonthsChange={setCustomRenewalMonths}
            disabled={readOnly || pending}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Questions</CardTitle>
              <CardDescription>
                Add questions, set types, and configure simple show-when rules.
              </CardDescription>
            </div>
            {!readOnly ? (
              <Button
                type="button"
                variant="outline"
                onClick={addQuestion}
                disabled={pending}
              >
                Add question
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => (
            <QuestionEditor
              key={field.id}
              field={field}
              allFields={fields}
              index={index}
              total={fields.length}
              disabled={readOnly || pending}
              onChange={(updated) => updateField(index, updated)}
              onRemove={() => removeField(index)}
              onMoveUp={() => moveField(index, -1)}
              onMoveDown={() => moveField(index, 1)}
            />
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        {!readOnly ? (
          <Button type="submit" disabled={pending}>
            <ActionPendingLabel
              pending={pending}
              pendingLabel="Saving…"
              idleLabel={
                props.mode === "create" ? "Create form" : "Save changes"
              }
            />
          </Button>
        ) : null}

        {state && !state.success ? (
          <p className="text-sm text-red-600" role="alert">{state.error}</p>
        ) : null}

        {state?.success && state.data?.message ? (
          <p className="text-sm text-green-700" role="status">
            {state.data.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
