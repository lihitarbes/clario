import { z } from "zod";
import { reorderFormFields } from "@/lib/forms/fields";
import type { FormFieldDefinition } from "@/types/database";

const optionalDescription = z
  .string()
  .trim()
  .max(2000, "Description is too long.")
  .optional()
  .transform((value) => (value === "" ? null : value));

export const formIdSchema = z.string().uuid("Invalid form.");

const formFieldTypeSchema = z.enum([
  "short_text",
  "long_text",
  "yes_no",
  "single_choice",
  "multiple_choice",
  "date",
  "checkbox",
]);

const visibleWhenSchema = z.object({
  questionId: z.string().trim().min(1, "Conditional reference is invalid."),
  value: z.union([z.string(), z.boolean()]),
});

const formFieldSchema = z
  .object({
    id: z.string().trim().min(1, "Question ID is required."),
    label: z
      .string()
      .trim()
      .min(1, "Question text is required.")
      .max(500, "Question text is too long."),
    type: formFieldTypeSchema,
    required: z.boolean(),
    order: z.number().int().min(0),
    options: z.array(z.string().trim().min(1)).optional(),
    helpText: z
      .string()
      .trim()
      .max(500, "Help text is too long.")
      .optional()
      .transform((value) => (value === "" ? undefined : value)),
    visibleWhen: visibleWhenSchema.optional(),
  })
  .superRefine((field, ctx) => {
    const choiceTypes = ["single_choice", "multiple_choice"];
    const noOptionTypes = [
      "short_text",
      "long_text",
      "yes_no",
      "date",
      "checkbox",
    ];

    if (choiceTypes.includes(field.type)) {
      if (!field.options || field.options.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "At least one option is required.",
          path: ["options"],
        });
      }
    }

    if (noOptionTypes.includes(field.type) && field.options?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "This question type cannot have options.",
        path: ["options"],
      });
    }
  });

function validateFieldsCollection(
  fields: z.infer<typeof formFieldSchema>[],
  ctx: z.RefinementCtx,
) {
  const ids = new Set<string>();

  for (const field of fields) {
    if (ids.has(field.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Question IDs must be unique within the form.",
        path: ["fields"],
      });
      break;
    }
    ids.add(field.id);
  }

  for (const field of fields) {
    if (!field.visibleWhen) {
      continue;
    }

    if (field.visibleWhen.questionId === field.id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A question cannot depend on itself.",
        path: ["fields"],
      });
      continue;
    }

    if (!ids.has(field.visibleWhen.questionId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Conditional question reference is invalid.",
        path: ["fields"],
      });
      continue;
    }

    const parent = fields.find((f) => f.id === field.visibleWhen!.questionId);
    if (!parent) {
      continue;
    }

    if (parent.type !== "yes_no" && parent.type !== "single_choice") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Conditional questions may only depend on Yes/No or single choice questions.",
        path: ["fields"],
      });
    }

    if (parent.type === "yes_no") {
      const value = field.visibleWhen.value;
      if (value !== "yes" && value !== "no") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Yes/No conditions must use value \"yes\" or \"no\".",
          path: ["fields"],
        });
      }
    }

    if (parent.type === "single_choice") {
      const value = String(field.visibleWhen.value);
      if (!parent.options?.includes(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Conditional value must match a parent option.",
          path: ["fields"],
        });
      }
    }
  }
}

export const formFieldsSchema = z
  .array(formFieldSchema)
  .min(1, "Add at least one question.")
  .superRefine(validateFieldsCollection);

const renewalPresetSchema = z.enum(["never", "3", "6", "12", "custom"]);

export const formBuilderSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Form name is required.")
      .max(120, "Form name is too long."),
    description: optionalDescription,
    renewalPreset: renewalPresetSchema,
    customRenewalMonths: z
      .union([z.string(), z.number()])
      .optional()
      .transform((value) => {
        if (value === undefined || value === "") {
          return null;
        }
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      }),
    fieldsJson: z.string().min(2, "Form questions are required."),
  })
  .superRefine((data, ctx) => {
    try {
      const parsed = JSON.parse(data.fieldsJson);
      const fieldsResult = formFieldsSchema.safeParse(parsed);
      if (!fieldsResult.success) {
        for (const issue of fieldsResult.error.issues) {
          ctx.addIssue({
            ...issue,
            path: ["fieldsJson"],
          });
        }
        return;
      }
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Form questions are invalid.",
        path: ["fieldsJson"],
      });
      return;
    }

    if (data.renewalPreset === "custom") {
      if (
        data.customRenewalMonths === null ||
        !Number.isInteger(data.customRenewalMonths) ||
        data.customRenewalMonths <= 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a positive whole number of months.",
          path: ["customRenewalMonths"],
        });
      }
    }
  })
  .transform((data) => {
    const parsed = JSON.parse(data.fieldsJson);
    const fields = reorderFormFields(
      formFieldsSchema.parse(parsed) as FormFieldDefinition[],
    );

    let renewalIntervalMonths: number | null = null;
    switch (data.renewalPreset) {
      case "never":
        renewalIntervalMonths = null;
        break;
      case "3":
        renewalIntervalMonths = 3;
        break;
      case "6":
        renewalIntervalMonths = 6;
        break;
      case "12":
        renewalIntervalMonths = 12;
        break;
      case "custom":
        renewalIntervalMonths = data.customRenewalMonths ?? null;
        break;
    }

    return {
      title: data.title,
      description: data.description,
      renewalIntervalMonths,
      fields,
    };
  });

export const updateFormBuilderSchema = formBuilderSchema.and(
  z.object({
    formId: formIdSchema,
  }),
);

export type FormBuilderInput = z.input<typeof formBuilderSchema>;
export type FormBuilderOutput = z.output<typeof formBuilderSchema>;
