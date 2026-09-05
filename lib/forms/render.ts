const HEBREW_PATTERN = /[\u0590-\u05FF]/;

/** Detect Hebrew script in form-owned text for yes/no label localization. */
export function formContentUsesHebrewLabels(text: string): boolean {
  return HEBREW_PATTERN.test(text);
}

export function yesNoDisplayLabels(contextText: string): {
  yes: string;
  no: string;
} {
  if (formContentUsesHebrewLabels(contextText)) {
    return { yes: "כן", no: "לא" };
  }

  return { yes: "Yes", no: "No" };
}
