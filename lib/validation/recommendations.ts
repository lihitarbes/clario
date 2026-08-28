import { z } from "zod";
import { visitIdSchema } from "@/lib/validation/visits";

export const recommendationCategorySchema = z.enum([
  "product",
  "medication",
  "device",
  "treatment",
  "other",
]);

export const recommendationIdSchema = z
  .string()
  .uuid("Invalid recommendation.");

const optionalInstructions = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((value) => (value === "" ? null : value));

const optionalProductId = z.preprocess(
  (val) => {
    if (val === null || val === undefined) {
      return null;
    }
    const trimmed = String(val).trim();
    return trimmed === "" ? null : trimmed;
  },
  z.union([z.null(), z.string().uuid("Invalid product.")]),
);

export const createRecommendationSchema = z.object({
  visitId: visitIdSchema,
  category: recommendationCategorySchema,
  title: z.string().trim().min(1, "Title is required.").max(200),
  instructions: optionalInstructions,
  productId: optionalProductId,
});

export const updateRecommendationSchema = z.object({
  recommendationId: recommendationIdSchema,
  category: recommendationCategorySchema,
  title: z.string().trim().min(1, "Title is required.").max(200),
  instructions: optionalInstructions,
  productId: optionalProductId,
});
