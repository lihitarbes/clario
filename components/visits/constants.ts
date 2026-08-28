const selectClassName =
  "flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:cursor-not-allowed disabled:opacity-50";

export const visitFormSelectClassName = selectClassName;

export const RECOMMENDATION_CATEGORIES = [
  { value: "product", label: "Product" },
  { value: "medication", label: "Medication" },
  { value: "device", label: "Device" },
  { value: "treatment", label: "Treatment" },
  { value: "other", label: "Other" },
] as const;
