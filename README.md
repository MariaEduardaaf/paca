# Paca Finance

Couple finance management app. Track expenses, budgets, bills, and goals together with your partner.

Built as a **Turborepo monorepo** with a web app, mobile app, and shared packages.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Web** | React 18, Vite, React Router 7, Tailwind CSS |
| **Mobile** | Expo 52, React Native, Expo Router, NativeWind |
| **State** | TanStack Query (React Query) |
| **Backend** | Supabase (Auth, Postgres, RLS, Edge Functions) |
| **Shared** | TypeScript, Zod validation, i18n |
| **Monorepo** | Turborepo + npm workspaces |

## Project Structure

```
paca/
├── apps/
│   ├── web/          # React + Vite web app
│   ├── mobile/       # Expo + React Native mobile app
│   └── blog/         # Astro static blog (pt-BR SEO: finanças para casais)
├── packages/
│   ├── api/          # Supabase client, React hooks, i18n provider
│   └── shared/       # Types, validations, constants, translations
├── supabase/
│   ├── migrations/   # Database schema (SQL)
│   ├── functions/    # Edge Functions (scan-receipt, check-budgets, etc.)
│   └── seed.sql      # Seed data
└── turbo.json
```

## Features

- **Dashboard** — Balance overview, income vs expenses, weekly summary, spending by category
- **Transactions** — Add, edit, delete. Filter by type, date, who paid. PDF export
- **Budget** — Monthly budget with per-category limits and progress tracking
- **Bills** — Fixed monthly bills checklist. Mark as paid, track progress
- **Smart Scan** — AI-powered receipt and bank statement scanning via Edge Functions
- **Couple System** — Invite code pairing, shared data with RLS, real-time sync
- **i18n** — English (default), Portuguese, Russian, Ukrainian. User selectable in settings
- **Dark Mode** — Full dark mode support on web

## Getting Started

### Prerequisites

- Node.js 18+
- npm 10+
- [Supabase](https://supabase.com) project (for backend)

### Install

```bash
npm install
```

### Environment Variables

Create `.env` files in each app:

**apps/web/.env**
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**apps/mobile/.env**
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Setup

Run **all** the migrations in `supabase/migrations/` in order (`00001` → `00022`) on your Supabase project (SQL Editor). They cover the full schema: core tables, bills, multi-currency, i18n (incl. Ukrainian), purchase advisor, usage stats, subscriptions, partner offers, and push tokens.

Optionally run `supabase/seed.sql` for default categories.

### Run

```bash
# Web (http://localhost:5173)
npm run dev:web

# Mobile (Expo dev server)
npm run dev:mobile
```

### Build

```bash
# Web (outputs to apps/web/dist)
npm run build

# Mobile
cd apps/mobile && eas build
```

## Shared Packages

### `@paca/shared`

Types, Zod validations, constants, utilities, and i18n translations. No React dependency.

### `@paca/api`

Supabase client, React hooks (`useProfile`, `useTransactions`, `useBudget`, `useBills`, etc.), real-time subscriptions, and `I18nProvider` + `useI18n` hook.

## i18n

Four languages supported: **English**, **Portuguese**, **Russian**, **Ukrainian**.

- Translations live in `packages/shared/src/i18n/`
- Language preference stored in `profiles.language` column and `localStorage`
- Users switch language in Profile > Preferences
- All formatting (dates, currency, greetings) respects the selected locale

## License

Private project.
