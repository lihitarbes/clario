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
   13. `migrations/20260829160000_form_templates_builder_and_archive.sql` (M7.1 — form renewal, soft archive, no hard delete)
   14. `migrations/20260829170000_form_assign_submit_rpc_and_snapshot.sql` (M7.2 — assign, fill, atomic submit RPC)
   15. `migrations/20260829180000_fix_submit_rpc_select_without_for_update.sql` (M7.2 fix — submit RPC SELECT without FOR UPDATE)
   16. `migrations/20260829190000_form_updates_and_notifications.sql` (M7.4/M7.5 — prefill, update assignments, form notifications)
   17. `migrations/20260904120000_purchase_status_completed.sql` (purchases — add `completed` status; profiles.phone)
   18. `migrations/20260904130000_product_images_storage.sql` (product images bucket + `products.image_path`)
   19. `migrations/20260904140000_visit_recommendation_product_on_delete_set_null.sql` (visit recommendations — product FK ON DELETE SET NULL)
   20. `migrations/20260904150000_product_images_storage_security_definer.sql` (product-images Storage RLS — SECURITY DEFINER helpers)
   21. `migrations/20260904160000_purchase_notifications.sql` (purchase notification types + triggers)
   22. `migrations/20260904170000_documents_storage_hardening_and_visit_check.sql` (documents Storage hardening + visit/client consistency)
   23. `migrations/20260904180000_business_availability_specific_date.sql` (date-specific availability; additive to weekly)
   24. `migrations/20260904190000_visit_published_notifications.sql` (visit_published notifications + visit_id)
   25. `migrations/20260905120000_documents_client_read_requires_published_visit.sql` (client document read requires published visit when visit-linked)
   26. `migrations/20260905130000_product_currency.sql` (product display currency ILS | USD)

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
| `20260829160000_form_templates_builder_and_archive.sql` | `renewal_interval_months`, `archived_at` on forms; drop owner DELETE policy (M7.1) |
| `20260829170000_form_assign_submit_rpc_and_snapshot.sql` | Submission snapshot, `submit_form_assignment` RPC, assignment completion trigger (M7.2) |
| `20260829180000_fix_submit_rpc_select_without_for_update.sql` | Fix submit RPC: drop `FOR UPDATE` so linked clients can resolve assignments under RLS (M7.2) |
| `20260829190000_form_updates_and_notifications.sql` | Prefill FK, client update INSERT RLS, submit supersedes, form notification types/triggers (M7.4/M7.5) |
| `20260904120000_purchase_status_completed.sql` | Add `completed` to purchases.status CHECK; add `profiles.phone` |
| `20260904130000_product_images_storage.sql` | `products.image_path` + private `product-images` bucket and RLS |
| `20260904140000_visit_recommendation_product_on_delete_set_null.sql` | `visit_recommendations.product_id` FK → `ON DELETE SET NULL` |
| `20260904150000_product_images_storage_security_definer.sql` | Product-images Storage write/read via SECURITY DEFINER helpers (fix nested products RLS in Storage policies) |
| `20260904160000_purchase_notifications.sql` | Purchase notification types, `notifications.purchase_id`, triggers |
| `20260904170000_documents_storage_hardening_and_visit_check.sql` | Documents Storage safe UUID helpers + SECURITY DEFINER policies; visit/client consistency trigger |
| `20260904180000_business_availability_specific_date.sql` | `specific_date` + nullable `day_of_week` (recurring XOR date-specific mode) |
| `20260904190000_visit_published_notifications.sql` | `visit_published` type, `notifications.visit_id`, first-publish trigger with duplicate guard |

## Storage path convention

Documents:

```
{business_id}/{client_id}/{document_id}/{file_name}
```

Product images (`product-images` bucket):

```
{business_id}/products/{product_id}/{file_name}
```

Example helpers: `buildDocumentStoragePath()` in `types/database.ts`; `buildProductImageStoragePath()` in `lib/products/storage.ts`.

## Notes

- Emails are stored **lowercased** on `profiles` (via auth trigger) and should be lowercased on `clients` at insert time (enforced in Server Actions in Milestone 2+).
- RLS is enabled on every application table; access is denied by default unless a policy allows it.
- Clients must query `client_visits` (not `visits`) for visit history; the view excludes `professional_notes`, only includes published visits (`published_at IS NOT NULL`), and masks `summary`/`follow_up` when `publication_scope = recommendations_only`.
- The auth trigger creates a `profiles` row when a user signs up. Pass `role` and `full_name` in signup metadata (`raw_user_meta_data`).
