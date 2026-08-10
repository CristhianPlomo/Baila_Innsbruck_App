# Baila Innsbruck App

Independent responsive PWA foundation for Baila Innsbruck Dance Studio.

This project is intentionally separate from the existing Baila Innsbruck web project. It uses React, TypeScript and Vite, with Supabase client access configured through `VITE_*` environment variables.

## Local setup

```bash
npm install
npm run dev
```

The local app starts at `http://localhost:5173`.

Copy `.env.example` to `.env.local` and add the Supabase publishable key before testing authentication. The frontend must never contain a service-role or secret key.

## Validation

```bash
npm run lint
npm run build
```

## Product direction

The product vision, implementation phases and quality boundaries are documented in [docs/PRODUCT_VISION.md](docs/PRODUCT_VISION.md). The app is currently designed for one Baila Innsbruck academy, with Supabase remaining the source of truth while the remote model is consolidated.

## Current scope

- Responsive visual shell aligned with the Baila visual identity.
- English, German and Spanish UI translations.
- Email/password authentication, email confirmation flow and member profiles.
- User and administrator navigation with role-protected admin routes.
- Course groups, schedules and public events with safe Supabase fallbacks.
- Admin workspace for users, members, classes, events, orders and settings.
- Supabase adapters for the existing profiles, roles, memberships, purchases and events tables.
- PWA manifest and service worker generation.

The product roadmap still includes the approved catalog of products and packs, membership entitlements, QR attendance and Capacitor packaging. These areas are not treated as complete until their data model and security rules are reviewed.

No Supabase migrations or schema changes are included in this project yet. The existing remote schema must remain the source of truth until the data model is consolidated and explicitly approved.
