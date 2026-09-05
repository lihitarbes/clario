import { describe, expect, it } from "vitest";
import {
  clearHiddenFormAnswers,
  isFormFieldVisible,
} from "@/lib/forms/visibility";
import type { FormFieldDefinition } from "@/types/database";

const alwaysVisible: FormFieldDefinition = {
  id: "q1",
  type: "short_text",
  label: "Name",
  required: true,
  order: 0,
};

const conditional: FormFieldDefinition = {
  id: "q2",
  type: "short_text",
  label: "Details",
  required: false,
  order: 1,
  visibleWhen: { questionId: "q1", value: "yes" },
};

describe("isFormFieldVisible", () => {
  it("shows unconditional questions", () => {
    expect(isFormFieldVisible(alwaysVisible, {})).toBe(true);
  });

  it("shows conditional questions when visibleWhen is satisfied", () => {
    expect(isFormFieldVisible(conditional, { q1: "yes" })).toBe(true);
  });

  it("hides conditional questions when visibleWhen is not satisfied", () => {
    expect(isFormFieldVisible(conditional, { q1: "no" })).toBe(false);
    expect(isFormFieldVisible(conditional, {})).toBe(false);
  });
});

describe("clearHiddenFormAnswers", () => {
  it("removes hidden answers and keeps visible ones", () => {
    const cleared = clearHiddenFormAnswers(
      [alwaysVisible, conditional],
      { q1: "no", q2: "should-go", other: "keep" },
    );

    expect(cleared).toEqual({ q1: "no", other: "keep" });
    expect(cleared.q2).toBeUndefined();
  });

  it("keeps answers for currently visible conditional fields", () => {
    const cleared = clearHiddenFormAnswers(
      [alwaysVisible, conditional],
      { q1: "yes", q2: "details" },
    );

    expect(cleared).toEqual({ q1: "yes", q2: "details" });
  });
});
