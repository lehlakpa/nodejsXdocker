# Stockroom frontend

React + Vite + Tailwind. The existing design is preserved, with UI, feature code, API calls and configuration separated.

## Local URLs

| Service | URL | Configuration |
| --- | --- | --- |
| Frontend | http://localhost:5173 | `FRONTEND_PORT` |
| Backend | http://localhost:5000 | `BACKEND_URL` for the development proxy |
| Backend health | http://localhost:5000/api/health | Backend route |
| Browser API | `/api` on the frontend origin | `VITE_API_BASE_URL` |

Copy `.env.example` to `.env.local` in this folder, then change the URLs there. Restart Vite after changing configuration. `VITE_*` values are public and embedded at build time; never put tokens, database URLs or other secrets in them.

The default `/api` base uses a proxy, so authentication works with HttpOnly cookies without storing tokens in browser storage. To use a separate API domain, set `VITE_API_BASE_URL=https://api.example.com/api`, configure backend `CLIENT_URL` to the exact frontend origin, and deploy with HTTPS and appropriate cookie settings.

## Folder structure

```text
src/
  api/
    client.js                # JSON requests, errors, timeout, abort, one refresh retry
    auth.api.js              # Login, registration, session and logout
    products.api.js          # Product CRUD endpoints
  components/
    ui/                      # Button, Modal, FormField, Toast, confirmation, error boundary
    layout/                  # Sidebar and workspace layout
    WorkspaceDialogs.jsx     # Composes feature forms into dialogs
  features/
    auth/components/         # Authentication form
    products/components/     # Cards, collection, summary, product form, banner
  config/env.js              # Validated public API configuration
  constants/                 # Endpoints, form limits, currency, sort options and timings
  hooks/useWorkspace.js      # Workspace state and async user actions
  pages/ProductsPage.jsx     # Page composition
  utils/products.js          # Formatting, validation, search and sorting
  App.jsx                    # Root and error boundary
  index.css                  # Tailwind import only
```

Add new API domains as separate files under `api/`, using the shared client. Keep network requests out of presentational components. Put shared UI in `components/ui/` and feature-specific UI under `features/`.

## Docker

Run from the repository root:

```sh
docker compose up -d --build
```

Open http://localhost:5173. Nginx serves compiled assets and proxies `/api` to `app:5000` on the Docker network. The backend serves only API routes. Rebuild after frontend source changes.

Docker uses root Compose environment variables (not `frontend/.env.local`):

- `FRONTEND_PORT` defaults to `5173`.
- `FRONTEND_API_BASE_URL` defaults to `/api` and is passed as a build argument.
- `FRONTEND_API_TIMEOUT_MS` defaults to `15000` and is passed as a build argument.

## Local development

Start the backend on port 5000, then in this folder:

```sh
npm ci
npm run dev
```

The project includes Node.js 22 for npm scripts without changing the system Node installation. If npm 11 skips the Windows Rolldown native binding, run `npx --yes npm@10 install --include=optional`. If npm asks for the Node install script, run `npm install-scripts approve node` and `npm rebuild node`.

If Docker occupies port 5173, use `npm run dev -- --port 5174` and open http://localhost:5174. The backend proxy is unchanged.

## Validation

```sh
npm run lint
npm test
npm run build
```

Tests cover API credentials and configuration, shared token refresh, retry limits, cancellation, failed writes, response errors, search/sort immutability and product validation. Backend tests run from the repository root with `npm test`.

This refactor provides a maintainable frontend structure. Deployments still need environment-specific HTTPS, backend secrets, database configuration and monitoring; those are separate from frontend code organization.
