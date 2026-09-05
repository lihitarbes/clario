import { describe, expect, it } from "vitest";
import {
  clientVisitListExcerpt,
  isFullClientPublication,
  ownerPublicationScopeLabel,
  ownerVisitPublicationBadge,
} from "@/lib/visits/display";

describe("visit publication display", () => {
  it("labels Full publication for owners", () => {
    expect(ownerPublicationScopeLabel("full")).toBe("Published · Full");
    expect(isFullClientPublication("full")).toBe(true);
  });

  it("labels Recommendations & documents only without implying summary access", () => {
    const label = ownerPublicationScopeLabel("recommendations_only");
    expect(label).toBe("Published · Recommendations & documents only");
    expect(label.toLowerCase()).not.toContain("summary");
    expect(label.toLowerCase()).not.toContain("follow-up");
    expect(isFullClientPublication("recommendations_only")).toBe(false);
  });

  it("shows Draft when unpublished", () => {
    expect(ownerVisitPublicationBadge(null, "full")).toBe("Draft");
    expect(
      ownerVisitPublicationBadge("2030-01-01T12:00:00.000Z", "full"),
    ).toBe("Published · Full");
  });

  it("uses scoped client excerpt that mentions recommendations and documents", () => {
    const excerpt = clientVisitListExcerpt(
      "recommendations_only",
      "Private summary text",
    );
    expect(excerpt).toBe("Recommendations and documents from this visit");
    expect(excerpt).not.toContain("Private summary text");
  });

  it("uses summary excerpt for full publication", () => {
    expect(clientVisitListExcerpt("full", "Care plan discussed")).toBe(
      "Care plan discussed",
    );
  });
});
