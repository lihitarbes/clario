"use client";

import type { FormFieldDefinition, FormFieldType } from "@/types/database";
import { Button } from "@/components/ui/button";
import {
  FormContentInput,
  FormContentTextarea,
} from "@/components/forms/FormContentFields";
import { Label } from "@/components/ui/label";
import { formContentDirProps } from "@/lib/forms/content-direction";
import {
  FORM_FIELD_TYPE_LABELS,
  FORM_FIELD_TYPES,
  formFormSelectClassName,
  getConditionalParentOptions,
  getConditionalValueOptions,
} from "@/components/forms/form-builder-helpers";

type QuestionEditorProps = {
  field: FormFieldDefinition;
  allFields: FormFieldDefinition[];
  index: number;
  total: number;
  disabled?: boolean;
  onChange: (field: FormFieldDefinition) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

function supportsOptions(type: FormFieldType): boolean {
  return type === "single_choice" || type === "multiple_choice";
}

export function QuestionEditor({
  field,
  allFields,
  index,
  total,
  disabled = false,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: QuestionEditorProps) {
  const parentOptions = getConditionalParentOptions(allFields, field.id);
  const selectedParent = parentOptions.find(
    (parent) => parent.id === field.visibleWhen?.questionId,
  );
  const conditionalValues = getConditionalValueOptions(selectedParent);

  function updateType(type: FormFieldType) {
    const next: FormFieldDefinition = {
      ...field,
      type,
      options: supportsOptions(type)
        ? field.options?.length
          ? field.options
          : ["Option 1"]
        : undefined,
      visibleWhen:
        type === "checkbox" && field.visibleWhen ? undefined : field.visibleWhen,
    };
    onChange(next);
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-zinc-900">
          Question {index + 1}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onMoveUp}
            disabled={disabled || index === 0}
          >
            Move up
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onMoveDown}
            disabled={disabled || index === total - 1}
          >
            Move down
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRemove}
            disabled={disabled}
          >
            Remove
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Question text</Label>
        <FormContentInput
          value={field.label}
          disabled={disabled}
          onChange={(event) =>
            onChange({ ...field, label: event.target.value })
          }
          placeholder="Enter the question clients will see"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Type</Label>
          <select
            value={field.type}
            disabled={disabled}
            onChange={(event) =>
              updateType(event.target.value as FormFieldType)
            }
            className={formFormSelectClassName}
          >
            {FORM_FIELD_TYPES.map((type) => (
              <option key={type} value={type}>
                {FORM_FIELD_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-zinc-900">
            <input
              type="checkbox"
              checked={field.required}
              disabled={disabled}
              onChange={(event) =>
                onChange({ ...field, required: event.target.checked })
              }
              className="rounded border-zinc-300"
            />
            Required
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Help text (optional)</Label>
        <FormContentTextarea
          value={field.helpText ?? ""}
          disabled={disabled}
          rows={2}
          onChange={(event) =>
            onChange({
              ...field,
              helpText: event.target.value || undefined,
            })
          }
          placeholder="Additional guidance shown below the question"
        />
      </div>

      {supportsOptions(field.type) ? (
        <div className="space-y-2">
          <Label>Options</Label>
          <div className="space-y-2">
            {(field.options ?? []).map((option, optionIndex) => (
              <div key={optionIndex} className="flex gap-2">
                <FormContentInput
                  value={option}
                  disabled={disabled}
                  onChange={(event) => {
                    const options = [...(field.options ?? [])];
                    options[optionIndex] = event.target.value;
                    onChange({ ...field, options });
                  }}
                  placeholder={`Option ${optionIndex + 1}`}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled || (field.options?.length ?? 0) <= 1}
                  onClick={() => {
                    const options = (field.options ?? []).filter(
                      (_, i) => i !== optionIndex,
                    );
                    onChange({ ...field, options });
                  }}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() =>
              onChange({
                ...field,
                options: [...(field.options ?? []), `Option ${(field.options?.length ?? 0) + 1}`],
              })
            }
          >
            Add option
          </Button>
        </div>
      ) : null}

      {parentOptions.length > 0 ? (
        <div className="space-y-3 rounded-md border border-zinc-100 bg-zinc-50 p-3">
          <p className="text-sm font-medium text-zinc-900">Conditional display</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Show when question</Label>
              <select
                value={field.visibleWhen?.questionId ?? ""}
                disabled={disabled}
                onChange={(event) => {
                  const questionId = event.target.value;
                  if (!questionId) {
                    onChange({ ...field, visibleWhen: undefined });
                    return;
                  }
                  const parent = parentOptions.find((p) => p.id === questionId);
                  const firstValue = getConditionalValueOptions(parent)[0]?.value ?? "yes";
                  onChange({
                    ...field,
                    visibleWhen: { questionId, value: firstValue },
                  });
                }}
                className={formFormSelectClassName}
                {...formContentDirProps()}
              >
                <option value="">Always show</option>
                {parentOptions.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {parent.label || "Untitled question"}
                  </option>
                ))}
              </select>
            </div>

            {field.visibleWhen ? (
              <div className="space-y-2">
                <Label>Has answer</Label>
                <select
                  value={String(field.visibleWhen.value)}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange({
                      ...field,
                      visibleWhen: {
                        questionId: field.visibleWhen!.questionId,
                        value: event.target.value,
                      },
                    })
                  }
                  className={formFormSelectClassName}
                >
                  {conditionalValues.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
