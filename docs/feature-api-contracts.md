# Feature API contracts

The current application is a React frontend. These contracts describe backend work required to make the requested features persistent, secure, and production-ready. Demo mode uses temporary in-memory responses and is not a substitute for authorization, billing, signing, or notification services.

## Phase 1 — Discovery

- `GET /properties` supports campus, room type, availability, geographic bounds, capacity, price, and pagination filters. Listings may include `location: { lat, lng }`, `distanceToCampusKm`, `walkingMinutes`, `transportMinutes`, `virtualTourUrl`, and roommate/review summary fields.
- `POST /saved-searches`, `GET /saved-searches`, `DELETE /saved-searches/:id`. A saved search stores a student-owned name and filter object. Alert delivery is server-side when a newly published listing matches.
- `GET /properties/compare?ids=id1,id2[,id3]` returns comparable public property facts. The client limits selection to two or three listings.
- `PATCH /profile/roommate-preferences` and `GET /roommates/matches` store private matching preferences and return opt-in compatible profiles only. Never expose contact details before consent.
- Virtual-tour URLs are validated server-side and restricted to approved HTTPS providers or uploaded media.
- Google Maps requires a restricted browser key (`VITE_GOOGLE_MAPS_API_KEY`) and geocoded property/campus coordinates. Distance and travel-time values must come from a routing/geospatial service, not client-side guesses.

## Phase 2 — Trust and safety

- `POST /properties/:id/reviews/:reviewId/responses` records one provider response per review; `POST /reviews/:id/flags` creates a moderation case. `GET /admin/review-flags` lists cases, and `PATCH /admin/review-flags/:id` records dismissal or `/hide-review` hides the review. All moderation actions are audited.
- Property safety metadata includes certificate type, issuer, issue/expiry dates, verification status, and administrator inspection reports. Private documents are accessed only through authenticated document endpoints.
- `POST /admin/properties/:id/reverification` records a completed review only after evidence is checked; `GET /admin/reverification-due` returns properties approaching or past the 12-month deadline. The server must validate evidence, update due dates, and enforce publication policy.
- Provider accreditation is structured and evidence-backed (for example NSFAS), with issuer, reference, status, and expiry.

## Phase 3 — Booking and money

- `POST /leases`, `GET /leases/:id`, `POST /leases/:id/signatures` create a versioned lease and record both parties' identity, consent, signature evidence, timestamps, and audit trail. A qualified e-signature provider and jurisdiction-specific legal review are required.
- `GET/POST /invoices`, `GET /provider/tenants/:id/payments`, and payment-provider webhooks manage invoices and verified payment history. Do not treat a client-submitted payment as settled.
- `POST /rooms/:id/waitlist`, `GET /waitlist/mine`, and provider/admin waitlist endpoints implement an ordered, consented queue with notification and expiry rules.

## Phase 4 — Communications and living

- Notification preferences and delivery events: `GET/PUT /notification-preferences`, `POST /notifications/test`, with email/SMS/WhatsApp provider webhooks and delivery status.
- `GET/POST /conversations`, `GET/POST /conversations/:id/messages` enforce participant and booking/application authorization.
- Provider/admin announcements: `GET/POST /announcements`, with campus/tenant audience scoping and delivery records.
- `GET/POST /viewings` and `PATCH /viewings/:id` manage available slots, booking, cancellation, and reminders.
- Maintenance tickets and evidence: `GET/POST /maintenance-requests`, `POST /maintenance-requests/:id/photos`, `PATCH /maintenance-requests/:id`.
- Move-in/out inspections: `GET/POST /bookings/:id/inspections` with timestamped photo evidence and acknowledgement.
- Listings include house rules and visitor policy versions; `POST /bookings/:id/rules-acknowledgement` records consent.
- Complaints support assignment, immutable status history, internal notes, and provider response through `/complaints/:id/*` resources.

## Phase 5 — Admin and reporting

- `GET /admin/reports` returns authorized aggregates; `GET /admin/reports/export?format=csv|pdf` creates scoped exports with audit events.
- University administrators carry explicit university/campus scope claims enforced by every API query and mutation.
- `GET /admin/documents/expiring` and notification jobs alert owners and reviewers ahead of certificate expiry.
- Admin 2FA requires enrollment, challenge, recovery codes, rate limits, and server-enforced step-up authentication.
- Fraud signals are stored as reviewable risk flags with evidence, status, and audit history; automated signals must not make irreversible decisions alone.

## Phase 6 — Platform

- PWA manifest/service worker cache only static assets and explicitly approved, non-sensitive booking summaries. Private documents and payment data are never placed in shared caches.
- Translation resources use locale keys and server/user preferences; supported initial locales include `en`, `zu`, `st`, and `af`.
- Dark mode is a user preference persisted per account/device and applied through semantic theme tokens.
- POPIA consent history, data export, correction, and deletion requests use `GET/POST /privacy/requests` and auditable workflow endpoints.
- Public API access uses versioned OAuth scopes, rate limits, and revocable client credentials. Webhooks use signed payloads, replay protection, retries, and delivery logs.

## Contract and security requirements

All endpoints must enforce role, ownership, campus scope, and consent server-side. Validate and normalize all input, return stable resource IDs and `{ message, errors? }` failures, paginate collections, and record auditable changes. Secrets for maps, payment, messaging, and signing providers belong in server configuration; browser keys must be domain-restricted.
