# Implementation changes log

This file records **approved differences** between the original design documents in `docs/clario-design.pdf` and the implemented application.

The original PDF is not modified. When the course documentation is updated later, use the **Original doc section** column to know what to revise.

---

## Milestone 0 baseline (approved before implementation)

### Routing — role-specific paths without `/business` or `/client` prefixes

| Field | Detail |
|-------|--------|
| **What changed** | Public URLs use role-specific paths where Next.js route groups would conflict. Business dashboard `/dashboard`, client dashboard `/home`, business products `/products`, client products `/shop`, business forms `/forms`, client forms `/my-forms`. Other routes follow the approved routing table. |
| **Why** | Route groups `(business)` and `(client)` do not appear in URLs. Two pages at the same path (e.g. both `/dashboard`) cause a build conflict. |
| **Required or recommended** | **Required** (technical) |
| **Original doc section** | Software Architecture Design §4 (Pages) |

---

### Next.js 16 `proxy.ts` instead of `middleware.ts`

| Field | Detail |
|-------|--------|
| **What changed** | Request interception uses root `proxy.ts` with exported `proxy` function (Next.js 16 convention), not deprecated `middleware.ts`. |
| **Why** | Project runs Next.js 16.3.2; `proxy.ts` is the current convention. Authorization remains in Server Actions and RLS, not in the proxy layer. |
| **Required or recommended** | **Required** (technical) |
| **Original doc section** | Detailed Technical Design §1 (Project folder structure) |

---

### Database — 14 tables (added `form_assignments`)

| Field | Detail |
|-------|--------|
| **What changed** | Added `form_assignments` table so forms can be assigned before submission. Original application tables: **14** (see Milestone 5.3 for `notifications`, total **15**). |
| **Why** | Forms need a pending/completed assignment state before the client submits. |
| **Required or recommended** | **Required** (approved product decision) |
| **Original doc section** | Architecture Design §3; Technical Design §3 |

---

### Database — `form_submissions.form_assignment_id`

| Field | Detail |
|-------|--------|
| **What changed** | Each submission links to the assignment that produced it via `form_assignment_id` FK. |
| **Why** | Clear audit trail from assignment → submission; supports reassignment after completion. |
| **Required or recommended** | **Recommended** (approved) |
| **Original doc section** | Technical Design §3 (Form Submissions) |

---

### Database — `businesses.default_appointment_duration_minutes`

| Field | Detail |
|-------|--------|
| **What changed** | Each business configures default appointment duration (MVP default: **60** minutes). Used for slot generation. |
| **Why** | Avoid hard-coding one duration for all businesses. |
| **Required or recommended** | **Required** (approved product decision) |
| **Original doc section** | Technical Design §3 (Businesses); §6 (Appointment booking) |

---

### Database — `clients.archived_at`

| Field | Detail |
|-------|--------|
| **What changed** | Clients are archived via nullable `archived_at` instead of hard delete. |
| **Why** | Historical visits, forms, documents, and purchases must remain intact. |
| **Required or recommended** | **Required** (approved product decision) |
| **Original doc section** | Technical Design §3 (Clients); §4 (CRUD) |

---

### Database — active client email uniqueness

| Field | Detail |
|-------|--------|
| **What changed** | Unique constraint on `(business_id, email)` for active (non-archived) clients, plus indexes supporting email linking. |
| **Why** | Secure client account linking by email; prevent duplicate active records per business. |
| **Required or recommended** | **Recommended** (approved) |
| **Original doc section** | Technical Design §3 (Clients); §6 (Client linking) |

---

### Database — one business per owner (MVP)

| Field | Detail |
|-------|--------|
| **What changed** | Unique constraint on `businesses.owner_id`. |
| **Why** | MVP scope: each business owner manages one business. |
| **Required or recommended** | **Required** (approved product decision) |
| **Original doc section** | Architecture Design §3 (Businesses) |

---

### Appointments — status values and visit rules

| Field | Detail |
|-------|--------|
| **What changed** | Statuses: `pending`, `scheduled`, `completed`, `cancelled`. Client self-booking creates `pending` (owner must approve). Owner-created appointments remain `scheduled`. Both `pending` and `scheduled` block availability slots. One visit per completed appointment. No visits without appointments in MVP. Slot granularity **15** minutes. Timestamps stored as `timestamptz` (UTC). |
| **Why** | Approved MVP scope and scheduling rules; owner approval before client bookings become confirmed. |
| **Required or recommended** | **Required** (approved product decision) |
| **Original doc section** | Technical Design §3 (Appointments, Visits); §6 (Visit management, Appointment booking) |

---

### Documents — controlled types and metadata

| Field | Detail |
|-------|--------|
| **What changed** | Document types: `receipt`, `visit_summary`, `insurance`, `other`. Added `file_name` and `mime_type` columns. |
| **Why** | Controlled MVP types; better downloads and ZIP reimbursement packaging. |
| **Required or recommended** | Types: **Required**. `file_name` / `mime_type`: **Recommended** (approved) |
| **Original doc section** | Technical Design §3 (Documents) |

---

### Purchases — MVP request workflow (no payment gateway)

| Field | Detail |
|-------|--------|
| **What changed** | Purchase statuses: `pending`, `confirmed`, `cancelled`. Client creates repurchase request; business updates status. No Stripe in MVP. |
| **Why** | Real payments remain optional; MVP focuses on order/request flow. |
| **Required or recommended** | **Required** (approved product decision) |
| **Original doc section** | Architecture Design §8; Technical Design §6 (Purchases) |

---

### Reimbursement — ZIP download via Route Handler

| Field | Detail |
|-------|--------|
| **What changed** | Clients download selected documents as a ZIP via a Route Handler (not PDF merge, no insurer integration). |
| **Why** | Approved MVP reimbursement flow. |
| **Required or recommended** | **Required** (approved product decision) |
| **Original doc section** | Product Specification §5–6; Technical Design §5 (Documents / API) |

---

### Client account linking

| Field | Detail |
|-------|--------|
| **What changed** | On signup/login, server links all eligible unlinked `clients` rows where normalized email matches authenticated user and `user_id` is null. Linking is server-validated only. |
| **Why** | Business may create client before account exists; one person may be client of multiple businesses. |
| **Required or recommended** | **Required** (approved product decision) |
| **Original doc section** | Architecture Design §3 (Clients); Technical Design §6 |

---

### Form reassignment

| Field | Detail |
|-------|--------|
| **What changed** | Same form may be assigned again after a previous assignment is `completed`. Only one **pending** assignment per `(form_id, client_id)` at a time (partial unique index). |
| **Why** | Supports re-assigning forms without blocking historical submissions. |
| **Required or recommended** | **Required** (approved product decision) |
| **Original doc section** | Technical Design §5 (Forms — assignForm) |

---

## Milestone 0 implementation notes

| Field | Detail |
|-------|--------|
| **What changed** | Foundation only: Supabase client helpers, `proxy.ts`, route shells, placeholder pages, Zod placeholder module, minimal UI components (shadcn-style), `.env.example`, README. No database migrations yet. |
| **Why** | Milestone 0 scope per approved plan. |
| **Required or recommended** | **Required** (implementation plan) |
| **Original doc section** | Technical Design §1 |

---

## Milestone 1 implementation notes

### Database migrations and RLS

| Field | Detail |
|-------|--------|
| **What changed** | Added `supabase/migrations/` with three SQL files: initial schema (14 tables), RLS policies, and Storage bucket/policies. Updated `types/database.ts`, typed Supabase clients, and `lib/auth/permissions.ts` helpers. |
| **Why** | Milestone 1 scope: database foundation with server-enforced access control. |
| **Required or recommended** | **Required** (implementation plan) |
| **Original doc section** | Architecture Design §3; Technical Design §3 |

---

### UNIQUE constraint on `form_submissions.form_assignment_id`

| Field | Detail |
|-------|--------|
| **What changed** | Each form assignment may produce at most one submission (`form_assignment_id` is UNIQUE). |
| **Why** | Enforces one submission per completed assignment; prevents duplicate submissions for the same assignment. |
| **Required or recommended** | **Required** (technical correctness) |
| **Original doc section** | Technical Design §3 (Form Submissions) |

---

### Profile creation via database trigger

| Field | Detail |
|-------|--------|
| **What changed** | `handle_new_user()` trigger on `auth.users` inserts into `profiles` with role from signup metadata (defaults to `client`). |
| **Why** | Ensures every auth user has a profile row; keeps signup atomic at the database layer. |
| **Required or recommended** | **Recommended** (implementation detail) |
| **Original doc section** | Technical Design §3 (Profiles) |

---

### Storage file size and MIME allowlist

| Field | Detail |
|-------|--------|
| **What changed** | `documents` bucket: private, 10 MB per file, allowed types PDF/JPEG/PNG/WebP/plain text. |
| **Why** | MVP document upload limits; reduces abuse risk. |
| **Required or recommended** | **Recommended** (MVP security) |
| **Original doc section** | Technical Design §9 (Documents validation) |

---

## Milestone 2 — client email linking RLS policy

| Field | Detail |
|-------|--------|
| **What changed** | Added `clients_link_by_email` RLS policy (`20260822120300_client_link_rls.sql`). Clients with role `client` may update unlinked `clients` rows where `lower(email)` matches their profile email, setting `user_id` to their own `auth.uid()`. |
| **Why** | Milestone 2 requires secure linking without service-role keys or client-supplied client IDs. Existing policies only allowed owners or already-linked clients to update rows. |
| **Required or recommended** | **Required** (technical — feature cannot work without it) |
| **Original doc section** | Technical Design §6 (Client linking); Architecture Design §7 (Permissions) |

---

## Milestone 2 implementation notes

| Field | Detail |
|-------|--------|
| **What changed** | Functional signup/login/logout, role-based layout guards, business auto-onboarding (`My Business`), client email linking on signup/login, Zod validation, auth error mapping. |
| **Why** | Milestone 2 scope. |
| **Required or recommended** | **Required** (implementation plan) |
| **Original doc section** | Product Specification §6; Technical Design §5 |

---

## Milestone 3 implementation notes

| Field | Detail |
|-------|--------|
| **What changed** | Business settings page (`/settings`) for owner business profile fields. Client management (`/clients`, `/clients/new`, `/clients/[id]`) with list, search, create, edit, and soft archive via `archived_at`. Server Actions with Zod validation and server-side business ownership checks. Client emails normalized to lowercase on write. |
| **Why** | Milestone 3 scope. |
| **Required or recommended** | **Required** (implementation plan) |
| **Original doc section** | Product Specification §4–5; Technical Design §4–5 |

---

## Milestone 4 implementation notes

| Field | Detail |
|-------|--------|
| **What changed** | Business availability CRUD on `/calendar` using `business_availability`. Appointment management for business owners: list (week navigation), create (`/calendar/new`), view/edit/cancel/complete (`/calendar/[id]`). Overlap checks for availability ranges and scheduled appointments enforced in Server Actions before insert/update. 15-minute slot alignment and default duration from business settings. No visit records created on completion. Client self-booking routes remain placeholders (implemented in Milestone 5). |
| **Why** | Milestone 4 scope. |
| **Required or recommended** | **Required** (implementation plan) |
| **Original doc section** | Product Specification §4–5; Technical Design §6 (Appointment booking, Visit management — scheduling portion only) |

---

## Milestone 3 bugfix — client insert without RETURNING

| Field | Detail |
|-------|--------|
| **What changed** | `createClientAction` pre-generates client UUID and omits `.select()` after insert to avoid PostgREST RETURNING triggering SELECT RLS failure. Same pattern applied to appointment and availability inserts. |
| **Why** | INSERT WITH CHECK succeeded but chained `.select()` failed SELECT RLS, surfacing a generic error. |
| **Required or recommended** | **Required** (technical correctness) |
| **Original doc section** | Technical Design §5 (Server Actions) |

---

## UX — authenticated user visiting signup from landing page

| Field | Detail |
|-------|--------|
| **What changed** | No code change in Milestone 3. When an already-authenticated user clicks signup/get-started on the landing page, redirect/session behavior can make it appear that nothing happened. |
| **Why** | Observed during Milestone 2 manual testing; deferred to a future UX improvement. |
| **Required or recommended** | **Recommended** (future UX improvement) |
| **Original doc section** | Product Specification §6 (Authentication flows) |

---

## Milestone 5 — client booking + owner approval

### Appointments — `pending` approval workflow

| Field | Detail |
|-------|--------|
| **What changed** | Added appointment status `pending`. Client booking creates `pending` requests. Business owner approves (`pending → scheduled`) or rejects (`pending → cancelled`). Owner-created appointments remain `scheduled`. Clients may cancel future `pending` or `scheduled` appointments (no reschedule/edit). Both `pending` and `scheduled` block availability slots and overlap checks. |
| **Why** | Keep the business owner in control of confirming client self-bookings while still reserving the requested slot immediately. |
| **Required or recommended** | **Required** (approved product decision) |
| **Original doc section** | Product Specification §5–6 (Appointment booking); Technical Design §3 (Appointments), §6 (Appointment booking) |

---

### Milestone 5 implementation notes

| Field | Detail |
|-------|--------|
| **What changed** | Client `/appointments` list (upcoming/previous) and `/appointments/book` slot-based booking UI. Availability-aware slot generation (15-minute granularity, full duration must fit availability). Multi-business selector when a client is linked to more than one business. Owner calendar shows pending requests; detail page supports Approve/Reject. Migration `20260827140000_appointment_pending_status.sql` extends status CHECK, updates blocking index, and tightens client INSERT/UPDATE RLS. Google Calendar and Visits remain deferred. |
| **Why** | Milestone 5 scope. |
| **Required or recommended** | **Required** (implementation plan) |
| **Original doc section** | Product Specification §4–5; Technical Design §5–6 |

---

## Milestone 5.1 — auth & navigation UX

| Field | Detail |
|-------|--------|
| **What changed** | `UserMenu` dropdown in business and client nav (avatar initials, name, role, logout). Landing page session-aware routing. Authenticated users visiting `/login` or `/signup` redirect to role home via `proxy.ts`. Removed standalone `LogoutButton`. |
| **Why** | Milestone 5.1 scope — polished authenticated header without new product features. |
| **Required or recommended** | **Required** (implementation plan) |
| **Original doc section** | Product Specification §6 (Authentication flows) |

---

## Milestone 5.2 — pending requests queue

| Field | Detail |
|-------|--------|
| **What changed** | Owner `/calendar` shows a pending appointment requests queue above the weekly grid (all pending appointments, not week-filtered). Inline Approve/Decline actions on each row; detail page approve/reject unchanged. |
| **Why** | Milestone 5.2 scope — faster owner workflow for booking approvals. |
| **Required or recommended** | **Required** (implementation plan) |
| **Original doc section** | Product Specification §5–6 (Appointment booking) |

---

## Milestone 5.3 — in-app notifications

### Database — `notifications` table (15th application table)

| Field | Detail |
|-------|--------|
| **What changed** | Added `notifications` table with RLS (SELECT own; UPDATE mark-read only). Rows created by SECURITY DEFINER triggers on appointment INSERT/UPDATE — not by application code. Types: `appointment_request`, `appointment_cancelled_by_client`, `appointment_approved`, `appointment_declined`. Migration `20260828120000_notifications.sql`. |
| **Why** | In-app notification center for booking workflow events without email/SMS/push. |
| **Required or recommended** | **Required** (approved product decision) |
| **Original doc section** | Product Specification §5–6; Technical Design §6 (Appointment booking) |

---

### Milestone 5.3 implementation notes

| Field | Detail |
|-------|--------|
| **What changed** | Notification bell in business and client nav with unread badge, dropdown list (title, message, relative timestamp, read/unread styling), per-notification mark-read, and mark-all-read. Server Actions update `read_at` only (RLS + trigger enforced). No realtime subscriptions or external notification services. |
| **Why** | Milestone 5.3 application layer after approved database triggers. |
| **Required or recommended** | **Required** (implementation plan) |
| **Original doc section** | Product Specification §4–5 |

---

## Milestone 6 — professional visit records

### Database — `client_visits` view and `visit_recommendations`

| Field | Detail |
|-------|--------|
| **What changed** | Hardened visit RLS (clients cannot SELECT `public.visits`). Added security-definer `client_visits` view projecting only client-safe columns (`summary`, `follow_up`; no `professional_notes`). Renamed `product_recommendations` → `visit_recommendations` with `category`, `title`, `instructions`, optional `product_id`. Migration `20260829120000_visits_m6_client_view_and_visit_recommendations.sql`. |
| **Why** | Visit records are a core clinical/professional artifact; clients need read-only access without exposing private owner notes. |
| **Required or recommended** | **Required** (approved product decision) |
| **Original doc section** | Product Specification §5–7 (Visits, Recommendations) |

---

### Milestone 6 implementation notes

| Field | Detail |
|-------|--------|
| **What changed** | Completing a scheduled appointment atomically creates exactly one draft visit via `complete_appointment_with_visit` RPC (idempotent retry-safe). Post-completion modal offers “Fill visit now” or “I'll do it later” — no auto-redirect. Owner visit page: draft/published state, publish/unpublish, summary, follow-up, private professional notes, recommendation CRUD. Client `/visits` and `/visits/[visitId]` query `client_visits` only (published visits only; never `visits` or `professional_notes`). Visit history on owner client profile and “View visit record” on completed appointment detail. |
| **Why** | Milestone 6 application layer after approved database migration. |
| **Required or recommended** | **Required** (implementation plan) |
| **Original doc section** | Product Specification §5–7 |

---

### Milestone 6 refinement — draft visits, publication, atomic completion

| Field | Detail |
|-------|--------|
| **What changed** | `visits.published_at` (NULL = draft, non-NULL = published to client). Existing visits remain draft. `client_visits` returns only published visits; recommendation client SELECT requires published visit. Atomic `complete_appointment_with_visit` RPC completes appointment and creates visit in one transaction. Completion modal replaces auto-redirect. Owner publish/unpublish actions on visit page. Migration `20260829130000_visit_published_at_and_complete_rpc.sql`. |
| **Why** | Separate appointment completion from client publication; prevent partial completion failures; explicit owner control before clients see visit content. |
| **Required or recommended** | **Required** (approved refinement) |
| **Original doc section** | Product Specification §5–7 (Visits) |

---

### Milestone 6 refinement — publication scope

| Field | Detail |
|-------|--------|
| **What changed** | `visits.publication_scope` (`full` vs `recommendations_only`) with `published_at`. Owner chooses sharing mode on publish; can change mode or unpublish. `client_visits` masks `summary`/`follow_up` when scope is recommendations-only; exposes scope for client UI logic. Already-published visits backfilled as `full`. Migration `20260829140000_visit_publication_scope.sql`. |
| **Why** | Owner controls whether clients see full visit notes or recommendations only. |
| **Required or recommended** | **Required** (approved refinement) |
| **Original doc section** | Product Specification §5–7 (Visits) |

---

*New entries will be appended as milestones are completed and as additional design-level changes are approved.*
