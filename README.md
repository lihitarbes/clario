# Clario

Web platform for small service-based businesses to manage clients, appointments, visits, forms, products, and documents.

**Stack:** Next.js 16, TypeScript, Supabase, Vercel.

## Local development

### Prerequisites

- Node.js 20+
- npm
- A Supabase project (required from Milestone 1; optional for Milestone 0 UI-only work)

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

3. Fill in Supabase values in `.env.local` when you have a project:
   - `NEXT_PUBLIC_SUPABASE_URL` — Project URL from Supabase dashboard
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project anon/public key

4. Apply database migrations (Milestone 1+):

   See [`supabase/README.md`](supabase/README.md) for step-by-step instructions.

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command        | Description              |
|----------------|--------------------------|
| `npm run dev`  | Start development server |
| `npm run build`| Production build         |
| `npm run start`| Start production server  |
| `npm run lint` | Run ESLint               |

## Project structure (overview)

```
app/
  (auth)/       Login and sign-up
  (business)/   Business-owner pages
  (client)/     Client pages
components/     UI and layout components
lib/            Supabase clients, routes, utilities
types/          Shared TypeScript types
proxy.ts        Next.js 16 request proxy (session refresh, redirects)
docs/           Design documents and implementation change log
```

Route groups `(business)` and `(client)` organize code and layouts; they do **not** appear in URLs.

## Documentation

- Product and technical design: `docs/clario-design.pdf`
- Assignment requirements: `docs/assignment-instructions.pdf`
- Approved implementation differences: `docs/implementation-changes.md`

## Deployment

Deployment to Vercel and Supabase will be configured in a later milestone.
