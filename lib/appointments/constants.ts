/** Slot granularity in minutes (approved MVP). */
export const SLOT_GRANULARITY_MINUTES = 15;

/** day_of_week: 0 = Sunday … 6 = Saturday (matches JS Date.getDay()). */
export const DAY_OF_WEEK_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
