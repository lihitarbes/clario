import { describe, expect, it } from "vitest";
import {
  formatWeekParam,
  formatWeekRangeLabel,
  getWeekStart,
  parseWeekParam,
  resolveWeekSearchParam,
  shiftWeekStart,
} from "@/lib/appointments/time";

describe("week navigation helpers", () => {
  it("resolves week search params from string or array", () => {
    expect(resolveWeekSearchParam("2026-09-06")).toBe("2026-09-06");
    expect(resolveWeekSearchParam(["2026-09-06", "extra"])).toBe("2026-09-06");
    expect(resolveWeekSearchParam(undefined)).toBeUndefined();
  });

  it("treats week=2026-09-06 as the week starting Sunday Sep 6", () => {
    const reference = parseWeekParam("2026-09-06");
    expect(reference).not.toBeNull();
    const weekStart = getWeekStart(reference!);
    expect(formatWeekParam(weekStart)).toBe("2026-09-06");
    expect(weekStart.getDay()).toBe(0);
  });

  it("shifts previous/next week by exactly 7 days", () => {
    const start = parseWeekParam("2026-09-06")!;
    expect(formatWeekParam(shiftWeekStart(start, -1))).toBe("2026-08-30");
    expect(formatWeekParam(shiftWeekStart(start, 1))).toBe("2026-09-13");
  });

  it("formats a clear visible week range label", () => {
    const start = parseWeekParam("2026-09-06")!;
    const label = formatWeekRangeLabel(start);
    expect(label).toContain("6");
    expect(label).toContain("12");
    expect(label).toContain("2026");
  });
});
