ByteRover Memory — Frontend↔Backend Connection (CORS + JWT)

Scope
- Keep this as the single source of truth for environment priority, API URL, ports, and run recipes for CSR (dev) and SSR (start).

Environment priority (highest → lowest)
1) config/.env.local — local overrides for both dev and start
2) config/.env.production — used when running npm start
3) config/.env.development — used when running npm run dev
4) config/.env.global — shared defaults
5) config/.env — base

Resolved ports
- VITE_PORT from env if set
- Default production: 5000
- Default development: 5001

API URL normalization
- VITE_API_URL is normalized to ensure protocol:
  - If value lacks protocol and starts with localhost/127.x → http://
  - If value lacks protocol and is a domain → https://

Key files adjusted
- config/vite.config.js
  - Loads env with correct priority; normalizes VITE_API_URL.
  - Exposes __API_URL__, __DEV_MODE__, __PORT__, __SKIP_BACKEND_CHECK__, etc.
  - Client receives process.env polyfill for VITE_*.
- config/server.js (SSR host)
  - Loads env with same priority as vite.config.
  - Normalizes VITE_API_URL; sets CORS from CORS_ORIGIN.
- config/.env.local
  - Set VITE_API_URL=http://localhost:3000 for local backend.
  - Set CORS_ORIGIN=http://localhost:5001, CORS_CREDENTIALS=true.
- src/services/service.apiSW.ts
  - Sends credentials: 'include'.
  - Avoids setting restricted headers in browser; only sets Origin/User-Agent in SSR.

Run recipes
- Local debug (CSR):
  - Backend (SSD): ensure env has CORS_ORIGIN=http://localhost:5001; JWT_SECRET set.
  - Frontend: cd Views/desktop/Current_V1 && npm run dev
  - Browser at http://localhost:5001; API at http://localhost:3000.
- Local SSR preview (start):
  - Backend (SSD): npm start with CORS_ORIGIN including http://localhost:5000 (or resolved VITE_PORT).
  - Frontend: npm start (builds SSR and runs Express SSR server on 5000).

CORS + JWT notes
- Frontend uses fetch with credentials: 'include' and Authorization header when authenticated.
- Backend must allow origins via CORS_ORIGIN and include 'Authorization' in allowed headers.
- If frontend and backend are on different domains/subdomains in production, set cookie SameSite=None; Secure=true on backend for cross-site JWT cookie usage.

Sanity checks
- Verify resolved values in console logs:
  - Vite dev: logs VITE_API_URL, VITE_PORT, VITE_DEV_MODE.
  - SSR server: logs API URL, port, env priority.
- Test endpoints via src/services/service.apiSW.ts:
  - api.getNav(), api.checkHealth(), api.login(email, password).

Common pitfalls
- Missing protocol in VITE_API_URL causes failed fetch/CORS — now auto-normalized.
- .env.local overrides all; ensure it matches current desired backend and port.
- Cross-site cookies require SameSite=None + Secure (backend change) when FE/BE are on different domains.

Importable utilities
- Quicksort utility saved at src/util/quicksort.js for reuse:
  import quickSort, { quickSortInPlace } from '@/util/quicksort';

Last updated by tooling: keep this document concise and current.
