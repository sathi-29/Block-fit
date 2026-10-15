# BlockFit Audit

Status: Current-state review, 2026-10-05

## Source of Truth

The canonical project and Git repository are in `final blockfit/BlockFit_Enhanced/` relative to the outer VS Code workspace. Run project commands from that directory. Its root `package.json` coordinates `backend/`, `web/`, and `mobile/`; shared catalog data lives in `shared/`, and record-integrity helpers live in `backend/src/lib/integrity.js`. The disconnected experimental `ai/` engine was removed after a repository-wide reference scan confirmed it was not part of any runtime, test, or build path.

The outer workspace had separate `backend/` and `web/` folders containing only empty `package-lock.json` files. Those files have been removed; the now-empty directories are not project roots and can be removed from the workspace/filesystem.

## Verified Configuration

The local browser/API port contract is aligned:

- Backend defaults to port `4000` in `backend/src/config/env.js`.
- `backend/.env.example` sets `PORT=4000` and `CLIENT_ORIGIN=http://localhost:5173`.
- Vite serves on `5173` and proxies `/api` to `http://127.0.0.1:4000` in `web/vite.config.js`.
- The browser client uses same-origin `/api` by default in `web/src/api.js`.

The previous audit's references to an obsolete source folder, frontend port `4100`, and inconsistent local ports were stale and should not be used for diagnosis.

CORS is allow-listed in `backend/src/app.js` using `allowedOrigins` from `backend/src/config/env.js`. Development origins are configured centrally, with Capacitor origins also accepted. Add explicit allowed/rejected-origin integration coverage to prevent regressions.

## Remaining Risks

- **End-to-end coverage:** Current backend tests cover API smoke, persistence, privacy, verification, and workout flows, but do not exercise the built browser app through a complete browser-to-API-to-verification journey.
- **Rep validity:** Exercise state and invalid-rep rules need benchmark-backed checks for noisy landmarks, incomplete range of motion, transitions, and duplicate counting.
- **Offline AI:** Confirm the inference library, model assets, licensing, bundle size, and offline behavior before claiming the model is bundled or cached.
- **Record integrity:** Internal hashes support record consistency; they are not a public blockchain feature and do not independently validate exercise accuracy.
- **Physiotherapy:** Exercise definitions and protocols need qualified clinical review; technical implementation alone cannot establish safety or therapeutic validity.
- **Android device:** A successful APK build does not prove camera, permissions, offline inference, or API behavior on a physical phone. Device testing remains a release gate.
- **Production configuration:** Production must provide strong `JWT_SECRET` and explicit allowed origins; development fallbacks are not suitable for deployment.

## Next Verification

Run backend and benchmark tests from this repository root, then add a repeatable browser/API end-to-end path. Record physical-device, model-asset, and qualified clinical-review evidence separately from code-level test results.
