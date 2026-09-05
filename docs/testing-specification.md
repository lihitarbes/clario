# Clario Testing Specification

Feature freeze testing plan for the **current** Clario application.
University categories: central features, invalid input, business processes, permissions, database, edge cases, basic UI.

## 1. Test strategy

| Level | Tooling | Scope |
|---|---|---|
| **AUTOMATED** | Vitest (Node) | Pure helpers: slots, overlap, routing, notification links, visit publication display, product/purchase helpers, form visibility, selected Zod schemas |
| **MANUAL** | Browser + Supabase project | Auth, RLS, Storage, Server Actions, full owner/client journeys, UI pending states |

We do **not** use Playwright/Cypress/RTL for this submission.
We do **not** claim automated RLS or E2E coverage.

Run automated tests:

```bash
npm test
npm run test:watch
```

## 2. Tests for central features

### AUTOMATED
- Explicit bookable slots (`listBookableSlots`, `availabilityAppliesToDate`)
- Visit publication labels / client excerpts (`lib/visits/display.ts`)
- Product currency formatting (`lib/products/display.ts`)
- Notification deep links to current routes (`lib/notifications/links.ts`)
- Role home paths and route classification (`lib/auth/routing.ts`, `lib/routes.ts`)

### MANUAL
- Owner dashboard, clients, calendar, forms, products, documents
- Client home, booking, forms, visits, shop, profile
- End-to-end publish Full vs Recommendations & documents only

See `docs/manual-regression-checklist.md`.

## 3. Invalid input tests

### AUTOMATED (Zod)
- `clientBookAppointmentSchema` / `appointmentFormSchema` — bad UUID, past start, non-aligned time, bad duration
- `availabilityFormSchema` / `specificDateAvailabilityFormSchema` — end ≤ start, bad date key
- `productFormSchema` — negative price, unsupported currency

### MANUAL
- Form submit with missing required answers
- Upload oversized / wrong-type document (storage/action errors)

## 4. Central business-process tests

### AUTOMATED
- Slot duration preserved (one row = one slot)
- Blocking intervals remove bookable slots
- Specific-date wins over overlapping recurring candidate
- Purchase owner status transition matrix (`canOwnerTransitionPurchaseStatus`)
- Conditional form answer clearing (`clearHiddenFormAnswers`)

### MANUAL
- Book → approve/decline → complete → draft visit → publish
- Assign form → submit → request update → resubmit
- Purchase request → confirm → complete / cancel
- Completing appointment creates visit

## 5. Permission tests

### AUTOMATED (route-safety helpers only)
- Cross-role redirect rejected (`getSafeRedirectPath`)
- Business vs client route classification

### MANUAL (authoritative for security)
- Client cannot open business routes; owner cannot open client-only routes
- Owner A cannot access Owner B data
- Client A cannot access Client B data
- Client cannot read draft visits or pre-publish visit documents

These are **MANUAL** — not simulated with fake RLS unit tests.

## 6. Database tests

### AUTOMATED
None against a live database (no local Supabase test harness).

### MANUAL
- Persistence of clients, slots, appointments, products, purchases
- Appointment overlap rejected in real create/book flow
- Form submission snapshot remains after template edits
- Storage/RLS for private documents and product images
- Published visit documents readable by the correct client

## 7. Edge-case tests

### AUTOMATED
- Adjacent slots do not overlap
- Different weekdays / different specific dates do not overlap
- Past slots excluded from booking list
- Cancelled appointments are not in `BLOCKING_APPOINTMENT_STATUSES`
- Mixed-currency purchase total formatting
- Hidden conditional answers removed; visible answers kept

### MANUAL
- Unlinked client empty states
- Archived client / archived form restrictions
- Inactive products hidden from shop

## 8. Basic UI tests

### AUTOMATED
None (no React Testing Library in this suite).

### MANUAL
Documented in `docs/manual-regression-checklist.md` § UI:
- Nav links, empty states, pending spinners/labels, disabled buttons while pending
- Human-readable statuses, notification deep links, ILS/USD display
- Role nav does not expose opposite-role screens
- Route loading uses ClarioLoading (not technical framework text in production)

## 9. Automated test implementation

| Area | Files |
|---|---|
| Config | `vitest.config.ts`, `package.json` scripts `test` / `test:watch` |
| Appointments | `lib/appointments/time.test.ts`, `overlap.test.ts`, `slots.test.ts` |
| Auth/routes | `lib/auth/routing.test.ts` |
| Notifications | `lib/notifications/links.test.ts` |
| Visits | `lib/visits/display.test.ts` |
| Products | `lib/products/display.test.ts` |
| Forms | `lib/forms/visibility.test.ts` |
| Validation | `lib/validation/appointments.availability.products.test.ts` |

Dependency: **Vitest only** (no Jest/Playwright/Cypress/RTL).

## 10. Documented manual regression tests

Authoritative checklist: **`docs/manual-regression-checklist.md`**.

All Supabase Auth, RLS, Storage, and browser flows are labeled **MANUAL**.

## 11. Success criteria

- `npm test` passes
- `npx tsc --noEmit` passes
- Manual Critical items in the checklist completed on the demo project (with latest migrations applied)
- Spec clearly separates AUTOMATED vs MANUAL coverage

## 12. Coverage limitations

- No automated E2E browser suite
- No automated RLS / Storage policy runner
- No Server Action integration tests with authenticated sessions
- Route-safety unit tests do **not** replace layout redirects + RLS
- UI pending/loading verified manually only
