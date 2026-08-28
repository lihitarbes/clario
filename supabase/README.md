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

## Storage path convention

```
{business_id}/{client_id}/{document_id}/{file_name}
```

Example helper in TypeScript: `buildDocumentStoragePath()` in `types/database.ts`.

## Notes

- Emails are stored **lowercased** on `profiles` (via auth trigger) and should be lowercased on `clients` at insert time (enforced in Server Actions in Milestone 2+).
- RLS is enabled on every application table; access is denied by default unless a policy allows it.
- The auth trigger creates a `profiles` row when a user signs up. Pass `role` and `full_name` in signup metadata (`raw_user_meta_data`).
