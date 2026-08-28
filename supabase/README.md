# Supabase migrations (Milestone 1)

SQL migrations for the Clario database schema, Row Level Security, and Storage policies.

## Apply to your Supabase project

### Option A — Supabase Dashboard (simplest)

1. Open your project in [Supabase Dashboard](https://supabase.com/dashboard) → **SQL Editor**.
2. Run each file **in order**:
   1. `migrations/20260822120000_initial_schema.sql`
   2. `migrations/20260822120100_rls_policies.sql`
   3. `migrations/20260822120200_storage.sql`
   4. `migrations/20260822120300_client_link_rls.sql` (Milestone 2 — client email linking)
   5. `migrations/20260827140000_appointment_pending_status.sql` (Milestone 5 — pending status + client booking RLS)
   6. `migrations/20260827150000_clients_select_linkable_by_email.sql` (client email-link SELECT visibility)
   7. `migrations/20260828120000_notifications.sql` (Milestone 5.3 — in-app notifications)
   8. `migrations/20260828140000_notification_messages_without_embedded_utc.sql` (M5.3 — UI-formatted appointment times in notifications)
   9. `migrations/20260829120000_visits_m6_client_view_and_visit_recommendations.sql` (Milestone 6 — client_visits view, visit_recommendations)
   10. `migrations/20260829130000_visit_published_at_and_complete_rpc.sql` (M6 refinement — published_at, atomic completion RPC)
   11. `migrations/20260829140000_visit_publication_scope.sql` (M6 refinement — publication scope full vs recommendations only)
   12. `migrations/20260829150000_completed_appointments_block_slots.sql` (blocking index includes completed appointments)

### Option B — Supabase CLI

```bash
# Link your project (once)
npx supabase link --project-ref <your-project-ref>

# Push migrations
npx supabase db push
```

## What is included

| Migration | Contents |
|-----------|----------|
| `20260822120000_initial_schema.sql` | 14 tables, indexes, constraints, profile signup trigger |
| `20260822120100_rls_policies.sql` | RLS helper functions and policies for all tables |
| `20260822120200_storage.sql` | `documents` bucket (private, 10 MB limit) and storage policies |
| `20260822120300_client_link_rls.sql` | RLS policy for secure client email linking (Milestone 2) |
| `20260827140000_appointment_pending_status.sql` | Appointment `pending` status, blocking index, tightened client booking RLS (Milestone 5) |
| `20260827150000_clients_select_linkable_by_email.sql` | SELECT policy so clients can see unlinked rows eligible for email linking |
| `20260828120000_notifications.sql` | `notifications` table, appointment-triggered creation, mark-read RLS (Milestone 5.3) |
| `20260828140000_notification_messages_without_embedded_utc.sql` | Notification trigger messages omit UTC time strings (UI formats from `appointment_id`) |
| `20260829120000_visits_m6_client_view_and_visit_recommendations.sql` | Visit RLS hardening, `client_visits` security-definer view (no `professional_notes`), `visit_recommendations` rename/generalization (Milestone 6) |
| `20260829130000_visit_published_at_and_complete_rpc.sql` | `published_at` draft/publish, `complete_appointment_with_visit` RPC, published-only `client_visits` (M6 refinement) |
| `20260829140000_visit_publication_scope.sql` | `publication_scope` (full vs recommendations only), masked `client_visits` columns (M6 refinement) |
| `20260829150000_completed_appointments_block_slots.sql` | Blocking partial index includes `completed` appointments (slot reservation) |

## Storage path convention

```
{business_id}/{client_id}/{document_id}/{file_name}
```

Example helper in TypeScript: `buildDocumentStoragePath()` in `types/database.ts`.

## Notes

- Emails are stored **lowercased** on `profiles` (via auth trigger) and should be lowercased on `clients` at insert time (enforced in Server Actions in Milestone 2+).
- RLS is enabled on every application table; access is denied by default unless a policy allows it.
- Clients must query `client_visits` (not `visits`) for visit history; the view excludes `professional_notes`, only includes published visits (`published_at IS NOT NULL`), and masks `summary`/`follow_up` when `publication_scope = recommendations_only`.
- The auth trigger creates a `profiles` row when a user signs up. Pass `role` and `full_name` in signup metadata (`raw_user_meta_data`).
