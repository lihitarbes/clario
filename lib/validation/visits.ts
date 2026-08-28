import { z } from "zod";

export const visitIdSchema = z.string().uuid("Invalid visit.");

export const publicationScopeSchema = z.enum(
  ["full", "recommendations_only"],
  { message: "Invalid sharing option." },
);

export const publishVisitSchema = z.object({
  visitId: visitIdSchema,
  publicationScope: publicationScopeSchema,
});

export const updateVisitPublicationScopeSchema = z.object({
  visitId: visitIdSchema,
  publicationScope: publicationScopeSchema,
});

const optionalVisitText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === "" ? null : value));

export const updateVisitSchema = z.object({
  visitId: visitIdSchema,
  summary: optionalVisitText(5000),
  followUp: optionalVisitText(2000),
  professionalNotes: optionalVisitText(5000),
});
