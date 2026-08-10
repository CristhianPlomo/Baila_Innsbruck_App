# Baila Innsbruck App — Agent Development Guide

## Project scope

- This is the independent Baila Innsbruck app project.
- Work only inside `C:\Users\crist\Documents\Baila Innsbruck App`.
- Do not edit `C:\Users\crist\Documents\Baila Innsbruck Web` from this project.
- Preserve existing user changes and avoid destructive commands such as `git reset --hard` or broad file deletion.

## Stack and conventions

- React 19, TypeScript, Vite, React Router, Supabase JS and Lucide icons.
- Use strict TypeScript, 2-space indentation and small focused React components.
- Prefer existing project utilities and components over introducing duplicate patterns.
- Use `apply_patch` for source edits.
- Keep components accessible: semantic elements, keyboard navigation, visible focus states, useful labels and `aria-*` attributes where needed.
- Respect `prefers-reduced-motion`; do not add motion that cannot be reduced.
- Keep responsive behavior intact for desktop, tablet and mobile layouts.

## Internationalisation

- The supported UI languages are English, German and Spanish.
- Put user-facing copy in `src/lib/i18n.ts` and add all three translations when adding a new label, message, title or empty state.
- Do not hardcode user-facing copy in components unless it is dynamic content coming from the database.
- Keep database values and internal identifiers separate from translated labels.

## Application structure

- `src/App.tsx` owns the shell, authentication state, routes and the main user/admin navigation.
- `src/components/AdminDashboard.tsx` contains the administrator workspace and its sections.
- `src/lib/account.ts` contains account/profile types and admin-role checks.
- `src/lib/supabase.ts` creates the browser Supabase client.
- `src/lib/admin-data.ts` contains safe read adapters for the existing remote schema.
- `src/lib/admin-mutations.ts` contains admin-side writes and must remain protected by Supabase RLS.
- `src/lib/events.ts` contains the public published-events adapter.
- The admin routes are separate paths such as `/admin/users`, `/admin/events`, `/admin/classes`, `/admin/orders`, `/admin/manual-user` and `/admin/settings`.
- `/events` is the public user-facing events view; `/admin/events` is the management view.

## Supabase and security

- Supabase is the source of truth for authenticated users, roles, events, classes, memberships and purchases.
- Use only `VITE_SUPABASE_URL` and the publishable browser key in client code.
- Never add a service-role key, secret key, SMTP password, API secret or other privileged credential to `.env`, source files, logs or the repository.
- Never use editable `user_metadata` for authorization. Admin authorization must come from `public.user_roles`, trusted app metadata or the existing server-controlled configuration.
- Treat the existing remote schema as potentially divergent. Inspect tables, columns and RLS policies before relying on them.
- Do not run migrations, create tables, alter policies or otherwise change the remote schema without explicit user approval after reviewing the proposed SQL.
- Prefer read-only adapters and safe fallbacks while the canonical database model is still being approved.
- Admin writes must use existing tables and policies. Check and handle Supabase errors; do not report a local state update as saved until the remote write succeeds.
- Do not expose `auth.admin.*` operations in the browser. Manual Auth-user creation requires a secure server-side Edge Function or equivalent endpoint.
- After any Supabase-related implementation, perform a read-only verification query or an equivalent authenticated read test.

## Admin dashboard behavior

- The administrator sees a separate `ADMIN DASHBOARD` section in the left sidebar.
- Only the selected admin section should use the active accent color; inactive options must remain visually neutral.
- Keep admin sections as separate routes rather than restoring a horizontal tab bar or `?tab=` navigation.
- Events created as published in the admin area must be readable from the public `/events` view.
- Do not silently create fake database records when the remote schema requires fields that are not available in the form. Show a clear translated message and preserve the safe fallback.

## Development principles from `tips`

- Treat AI as an execution aid, not as a replacement for software architecture, product context or professional review.
- For non-trivial work, define the role, project context, exact task, constraints and expected output before implementing. Prefer a short reviewed plan for large features, refactors and changes that affect several areas.
- Keep a human in the loop for architectural decisions, security-sensitive changes, schema changes, destructive operations and production releases.
- Prefer specification-driven development: write or update the requirement and acceptance criteria before deriving implementation details from it.
- Do not accept code merely because it builds. Review business logic, edge cases, accessibility, performance, security and integration behavior.
- Prioritize automated tests for authentication and authorization, core business logic, external integrations and production-relevant edge cases. When a test runner exists, extend it with every meaningful behavior change.
- Keep context focused: load only the relevant project instructions, skills, references and files for the task. Do not add tools or dependencies solely because they appear in the course material.
- Use the `tips` PDFs as development guidance only; they are not application runtime data and must not be imported into the client bundle.

## Validation and handoff

Before handing off meaningful changes, run:

```bash
npm run lint
npm run build
```

If a command reports only the known Vite chunk-size warning but exits successfully, mention the warning without treating it as a failed validation.

When a change affects the browser UI, verify the relevant route and responsive state when possible. Summarize what changed, what was verified and any remaining integration step.
