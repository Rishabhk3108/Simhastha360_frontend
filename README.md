# Simhastha 360 — Web Platform

React + Vite + TypeScript web app covering the desk-based and public-facing parts of Simhastha 360 (spec sections 7 & 8):

- **Admin / Command Centre dashboard** (`/admin`, login required) — live monitoring, facility management, volunteer review, task assignment with AI-suggested best-fit volunteers, field team coordination
- **Public "Peace of Mind" dashboard** (`/family/:token`, no login) — last-known location and area safety status for a pilgrim's shared link
- **Volunteer registration** (`/volunteer-register`, no login) — the web variant of registration for anyone without the app yet

## Setup
```bash
npm install
cp .env.example .env   # point VITE_API_BASE_URL at the backend
npm run dev
```

Requires the [backend](../backend) running (default `http://127.0.0.1:8000`).

## Structure
- `src/api/` — axios client (attaches JWT from localStorage) and TypeScript types mirroring the backend's Pydantic schemas
- `src/auth/` — auth context (login/logout, token persistence)
- `src/pages/admin/` — the five admin dashboard pages, behind `ProtectedRoute`
- `src/pages/` — public pages (login, volunteer registration, family dashboard)

## Known placeholders
- No live map yet — the spec's Mappls Maps SDK (base map, geofencing, routing) integration is the natural next addition, most relevant to the mobile app's Visitor mode but also useful for the admin facility/zone views here.
- Volunteer availability toggle, task acknowledge/complete, and live location updates are mobile-app-only per spec — this web app only covers the desk-based admin flows and public pages.
