# Clario Manual Regression Checklist

All items below are **MANUAL** tests (browser + Supabase).
They are not automated by Vitest.

Use two business owners and two clients when testing isolation.

Latest migrations (including product currency and published-visit document rules) must be applied on the demo project.

---

## A. Permissions (MANUAL)

| ID | Scenario | Expected |
|---|---|---|
| P1 | Client opens `/dashboard`, `/clients`, `/calendar`, `/products`, `/forms`, `/settings` | Redirected away (client area) |
| P2 | Owner opens `/home`, `/appointments`, `/shop`, `/my-forms`, `/profile`, `/visits` | Redirected away (business area) |
| P3 | Owner A tries to open Owner B client / product / appointment URLs | Access denied / not found / empty — no B data |
| P4 | Client A tries to open Client B visit / form assignment / purchase | Access denied / not found |
| P5 | Client opens a **draft** (unpublished) visit URL | No visit content (not found / inaccessible) |
| P6 | Client tries visit-linked document before visit is published | Not readable |
| P7 | After publish, correct client can read visit-linked documents | Readable / downloadable |
| P8 | Logout then open protected route | Redirect to login |

---

## B. Database / Storage / persistence (MANUAL)

| ID | Scenario | Expected |
|---|---|---|
| D1 | Create/update client, settings, product, bookable slot | Values persist after refresh |
| D2 | Create overlapping appointment or book blocked slot | Rejected with clear error |
| D3 | Complete a scheduled appointment | Visit record created (draft) |
| D4 | Submit form, then edit template questions | Past submission keeps snapshot / historical answers |
| D5 | Upload private document / product image | Not publicly listable; only authorized signed access |
| D6 | Publish visit; client opens documents | Published visit docs visible to that client |
| D7 | Appointment approve / cancel / complete | Status persists; notifications created as designed |
| D8 | Purchase pending → confirmed → completed (and cancel paths) | Status persists; invalid jumps not offered / rejected |

---

## C. Central business journeys (MANUAL)

### Business owner

1. Log in → `/dashboard` shows useful summary.
2. Add client (email for client account).
3. Create recurring + one-time **bookable slots** on Calendar.
4. Create form → assign to client.
5. Approve pending booking → complete appointment → visit draft.
6. Add recommendation; upload visit document.
7. Publish **Full**; confirm client sees summary.
8. Publish (or second visit) **Recommendations & documents only**; client does **not** see summary/follow-up.
9. Create ILS and USD products; process a purchase request.
10. Archive a form; confirm cannot assign.
11. Log out.

### Client

1. Log in (linked email) → `/home`.
2. Book an **explicit** open slot → pending.
3. After approval: see appointment; cancel if testing cancellation.
4. Complete assigned form.
5. Open published visit; verify scope.
6. Download reimbursement ZIP from visit docs.
7. Shop: cart → Request purchase → see in orders.
8. Open notifications → deep links land on correct pages.
9. Attempt business URL → redirected.
10. Log out.

---

## D. Basic UI (MANUAL)

| ID | Check | Expected |
|---|---|---|
| U1 | Owner and client nav links | Navigate to existing pages |
| U2 | Empty states (no clients, no slots, no forms, empty shop) | Useful copy / CTA — not blank shells |
| U3 | Save / Book / Submit / Publish / Upload / Request purchase | Spinner + clear pending label |
| U4 | Same actions while pending | Triggering control disabled (no double submit) |
| U5 | Success and failure | Human-readable status / alert text |
| U6 | Appointment and purchase badges | Labels like Pending / Booked / Confirmed — not raw enums |
| U7 | Notification Open / deep links | Land on current role routes |
| U8 | Product prices | ILS and USD formatting looks correct |
| U9 | Role navigation | Opposite-role screens not exposed in nav |
| U10 | Route transitions in production | ClarioLoading / branded loading — not technical framework text |

---

## Sign-off

| Area | Tester | Date | Pass? |
|---|---|---|---|
| Permissions P1–P8 | | | |
| Database D1–D8 | | | |
| Owner journey | | | |
| Client journey | | | |
| UI U1–U10 | | | |
