# Student Living frontend

Production-oriented React frontend for student accommodation discovery, applications, provider management and institutional administration.

## Setup

```powershell
Copy-Item .env.example .env
pnpm install
pnpm dev
```

`VITE_API_URL` defaults to `/api`. Point it at the Node/Express REST API when it is hosted separately. Authentication uses the API JWT stored as `sl_token`; protected documents are always fetched as authenticated blobs.

## Public demo mode

Set `VITE_DEMO_MODE=true` in the deployment environment before building to enable the public demo. The login page then offers passwordless sample access for student, provider, university administrator and system administrator roles. The application uses bundled fictional listings and mock API responses; no real API, accounts or services are contacted in this mode. A visible demo badge marks the site.

Do not enable demo mode on a deployment intended for real users. Demo changes are temporary and reset when the page is refreshed. The included `.env.example` enables demo mode for a quick public-demo setup. For an API-backed deployment, set `VITE_DEMO_MODE=false` and configure `VITE_API_URL`; no demo login controls are then shown.

## Scripts

- `pnpm dev` — start Vite
- `pnpm build` — type-check and create a production build
- `pnpm lint` — run ESLint
- `pnpm preview` — preview the production build

## API contract

The frontend expects the REST resources described by the Student Living API: `/auth`, `/properties`, `/applications`, `/bookings`, `/reviews`, `/favourites`, `/notifications`, `/provider`, `/admin`, and `/system`. Errors should use `{ message, errors? }`; list resources should return their named collection (for example `{ properties: [] }`). The API remains the source of truth for authorization and validation.

The requested feature rollout is implemented in phases. Production API additions, authorization requirements, and third-party integration notes are documented in [docs/feature-api-contracts.md](./docs/feature-api-contracts.md). Phase 1 currently covers saved-search UI/alerts, property comparison, Google Maps location links, and virtual-tour links; full maps, routing-time calculations, and roommate matching require the APIs and restricted Maps key described there.
