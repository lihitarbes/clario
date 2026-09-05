/**
 * Text direction for form-owned content (titles, labels, help text, options).
 *
 * Uses the HTML `dir="auto"` attribute so the browser selects RTL or LTR from
 * the first strong character in each field (Unicode TR9 / bidi algorithm).
 * Hebrew-dominant text renders RTL; English-dominant text renders LTR.
 *
 * Apply only to form content — not Clario app chrome (nav, buttons, labels).
 * Reuse in M7.2 client form rendering.
 */
export const FORM_CONTENT_DIR = "auto";

/** Props for editable or displayed form content fields. */
export function formContentDirProps(): { dir: typeof FORM_CONTENT_DIR } {
  return { dir: FORM_CONTENT_DIR };
}
