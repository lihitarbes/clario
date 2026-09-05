import { describe, expect, it } from "vitest";
import { notificationHref } from "@/lib/notifications/links";

const base = {
  form_assignment_id: null as string | null,
  client_id: null as string | null,
  appointment_id: null as string | null,
  purchase_id: null as string | null,
  visit_id: null as string | null,
};

describe("notificationHref", () => {
  it("links form assignment and update requests to client my-forms", () => {
    expect(
      notificationHref({
        ...base,
        type: "form_assigned",
        form_assignment_id: "a1111111-1111-1111-1111-111111111111",
      }),
    ).toBe("/my-forms/a1111111-1111-1111-1111-111111111111");

    expect(
      notificationHref({
        ...base,
        type: "form_update_requested",
        form_assignment_id: "a1111111-1111-1111-1111-111111111111",
      }),
    ).toBe("/my-forms/a1111111-1111-1111-1111-111111111111");
  });

  it("links form submissions to the owner client forms route", () => {
    expect(
      notificationHref({
        ...base,
        type: "form_submitted",
        client_id: "c1111111-1111-1111-1111-111111111111",
        form_assignment_id: "a1111111-1111-1111-1111-111111111111",
      }),
    ).toBe(
      "/clients/c1111111-1111-1111-1111-111111111111/forms/a1111111-1111-1111-1111-111111111111",
    );
  });

  it("links appointment owner and client notifications to current routes", () => {
    expect(
      notificationHref({
        ...base,
        type: "appointment_request",
        appointment_id: "p1111111-1111-1111-1111-111111111111",
      }),
    ).toBe("/calendar/p1111111-1111-1111-1111-111111111111");

    expect(
      notificationHref({
        ...base,
        type: "appointment_approved",
      }),
    ).toBe("/appointments");

    expect(
      notificationHref({
        ...base,
        type: "appointment_declined",
      }),
    ).toBe("/appointments");
  });

  it("links purchase notifications by role", () => {
    expect(
      notificationHref({
        ...base,
        type: "purchase_requested",
        purchase_id: "u1111111-1111-1111-1111-111111111111",
      }),
    ).toBe("/products?purchase=u1111111-1111-1111-1111-111111111111");

    expect(
      notificationHref({
        ...base,
        type: "purchase_confirmed",
        purchase_id: "u1111111-1111-1111-1111-111111111111",
      }),
    ).toBe("/shop?orders=1&purchase=u1111111-1111-1111-1111-111111111111");

    expect(
      notificationHref(
        {
          ...base,
          type: "purchase_cancelled",
          purchase_id: "u1111111-1111-1111-1111-111111111111",
        },
        "business_owner",
      ),
    ).toBe("/products?purchase=u1111111-1111-1111-1111-111111111111");

    expect(
      notificationHref(
        {
          ...base,
          type: "purchase_cancelled",
          purchase_id: "u1111111-1111-1111-1111-111111111111",
        },
        "client",
      ),
    ).toBe("/shop?orders=1&purchase=u1111111-1111-1111-1111-111111111111");
  });

  it("links published visits to the client visit detail route", () => {
    expect(
      notificationHref({
        ...base,
        type: "visit_published",
        visit_id: "v1111111-1111-1111-1111-111111111111",
      }),
    ).toBe("/visits/v1111111-1111-1111-1111-111111111111");
  });
});
