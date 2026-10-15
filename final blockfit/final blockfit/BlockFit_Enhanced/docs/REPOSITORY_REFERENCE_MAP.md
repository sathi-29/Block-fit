# Repository Reference Map

Status: cleanup record and post-reference inventory, 2026-10-05

This map records the project wiring and cleanup decisions. It distinguishes the supported web/Capacitor application from isolated or conflicting implementations. Recheck references and current use before future removal.

## Canonical project boundary

The Git repository and application root is `BlockFit_Enhanced/`, not the outer VS Code workspace. The project has three independently locked runtime packages (`backend/`, `web/`, and `mobile/`) plus a root orchestration package with scripts only. The outer workspace's `.idea/` and sibling placeholder folders are outside this repository and are not part of this cleanup.

## Runtime entry points

| Runtime | Entry chain | Configuration / build |
| --- | --- | --- |
| Browser | `web/index.html` -> `web/src/main.js` -> `web/src/app.js` -> page modules | `web/vite.config.js`; output `web/dist/`; backend serves built assets when present |
| API | `backend/src/server.js` -> `backend/src/app.js` -> route modules | `backend/src/config/env.js`; port defaults to 4000 |
| APK | `mobile/build-apk.mjs` -> web build -> Capacitor `sync android` -> `mobile/android/gradlew assembleDebug` | `mobile/capacitor.config.json` sets `webDir: ../web/dist`; `mobile/api-config.json` or `VITE_API_BASE` supplies the public API URL |
| CI | `.github/workflows/build-apk.yml` | Installs backend/web/mobile lockfiles, then runs the APK build |
| Deployment | Render web service builds root package and starts `backend/src/server.js` | `render.yaml`; provisions PostgreSQL |

The documented/canonical Android delivery path is Capacitor packaging the shared web interface. Android resources under `mobile/android/app/src/main/res/`, the Java `BridgeActivity`, Gradle wrapper/configuration, generated Capacitor config, and Cordova plugin project participate in that build.

## Browser route map

`web/src/app.js` owns hash routing and authentication gates. Routes:

- Public: `/`, `/login`, `/register`, `/forgot-password`, `/reset-password/:token`, `/verify/:id`.
- Authenticated: `/dashboard`, `/workout`, `/rehabilitation`, `/history`, `/profile`.
- `/verify/:id` is a public shareable summary; password reset is token-addressed.

The UI/API client is `web/src/api.js`; session access is `web/src/auth.js`. `web/src/main.js` installs analytics/error tracking and starts the app.

## API route map

`backend/src/app.js` mounts all route groups below `/api` and applies shared Helmet, CORS, logging, JSON parsing, rate limits and error handling.

| Route group | Endpoints |
| --- | --- |
| `/api/health` | `GET /` health check |
| `/api/auth` | `POST /register`, `/login`, `/forgot-password`, `/reset-password` |
| `/api/users` | `GET /me`, `DELETE /me` |
| `/api/workouts` | `POST /nonce`, `GET /`, `POST /` |
| `/api/rom` | `GET /:workoutId`, `POST /:workoutId` |
| `/api/verification` | `GET /public/:verificationId`, `POST /register`, `POST /:verificationId/revoke` |
| `/api/analytics` | `POST /` |
| `/api/clinicians` | `POST /invite`, `/claim`; `GET /connections`; `POST /connections/:connectionId/approve`, `/revoke`; `GET /patient/:patientId/summary` |

Authentication and explicit patient approval are enforced in backend middleware/routes, not merely by hidden UI links.

## Import and data-flow map

### Active web movement pipeline

`web/src/pages/workout.js` imports:

- `web/src/pose/poseDetector.js` for MediaPipe inference and camera-frame landmarks.
- `web/src/pose/movementAnalysis.js` for pose confidence and user repositioning feedback.
- `web/src/exercises/{squat,pushup,lunge,bicepCurl,plank}.js` for the five enabled analyzers.
- `web/src/pose/angles.js` and `landmarks.js` for shared geometry and landmark constants through analyzers.
- `web/src/ui/overlay.js` for skeleton drawing.
- `web/src/api.js`, `auth.js`, `analytics.js`, and `coach.js` for session save, user context, telemetry and post-set summary.
- `shared/exerciseCatalog.mjs` for selection metadata.

The model is fetched from the MediaPipe CDN by `web/src/pose/poseDetector.js`; there is no checked-in model asset to delete. `web/src/pose/romMeasurements.js` is imported by both its tests and `backend/src/routes/rom.js`, so it is not dead code even though it lives under `web/`.

### Backend storage and integrity

`backend/src/routes/*` imports the storage facade from `backend/src/lib/dataStore.js`. That facade selects the PostgreSQL-backed implementation in `backend/src/lib/store.js` when `DATABASE_URL` is set, otherwise the in-memory `createStore()` implementation. PostgreSQL schema loading reads `backend/src/db/schema.sql`. Record hashing/nonces use `backend/src/lib/integrity.js`.

`backend/src/db/database.js` defined a second, older in-memory model, but repository import/symbol searches found no consumers outside that file. It was removed after the restore point; backend and related regression tests still pass.

### Isolated AI prototype

`ai/exerciseEngine.mjs`, `ai/repStateMachine.mjs`, `ai/README.md`, and `shared/verificationTypes.mjs` were connected only to each other; repository reference searches found no app, backend, build, test, or benchmark consumer. They were removed after the restore point as a disconnected competing source of movement/result logic. The live browser continues to use the analyzers listed above. Historical audit descriptions remain marked historical.

### Android native branch

`mobile/android/app/src/main/java/com/blockfit/app/MainActivity.java` extends Capacitor `BridgeActivity`, matching the configured APK packaging path. The tree also contains a Kotlin `MainActivity.kt` and a complete Compose/CameraX/ML Kit client, domain engine and tests. Gradle applies the Kotlin plugin and includes both source roots; the two files declare the same fully qualified class name. This is a genuine competing Android implementation and a build-risk, not a name-only unused file. Preserve until the baseline Gradle compile result is known; if removed, remove the whole competing Kotlin source/test path and its now-unneeded dependencies together, retaining Capacitor, Java activity, Android resources and generated config.

## Configuration, dependencies and assets

### npm package dependencies

- Root `package.json`: scripts only; orchestrates workspace commands.
- `web/package.json`: `@mediapipe/tasks-vision` is imported by the pose detector; Vite is used by the dev/build scripts.
- `backend/package.json`: Express/CORS/Helmet/rate limit/Morgan are imported by app setup; Zod by route validation; bcrypt/JWT by auth; dotenv by env; nodemailer by reset-email flow; `pg` by PostgreSQL store.
- `mobile/package.json`: Capacitor core/android/CLI participate in `cap sync android`, config and APK generation.
- Android Gradle dependencies support the retained Kotlin source/tests and Capacitor build. `androidx.security:security-crypto` and `org.mockito:mockito-core` were removed after source/test scans found no consumers. The Android build remains unverified because the configured JetBrains JBR crashed during Gradle startup.

Three package lockfiles are intentionally required by `npm ci` and GitHub Actions: `backend/package-lock.json`, `web/package-lock.json`, `mobile/package-lock.json`. Do not remove or merge them without changing build/deployment scripts.

### Environment and secrets

- Templates: `backend/.env.example`, `web/.env.example`, `mobile/api-config.example.json`.
- Local ignored values: `.env` / `.env.*.local`, `mobile/api-config.json`; keep these private and do not delete or print their contents.
- Production requires `JWT_SECRET`, `INTEGRITY_HMAC_SECRET` and `DATABASE_URL`; SMTP is needed for password-reset email. `VITE_API_BASE` is used by the APK build script.
- `backend/.env.example` had listed `BLOCKCHAIN_NETWORK`, `BLOCKCHAIN_RPC_URL` and `BLOCKCHAIN_PRIVATE_KEY`; source search found no runtime consumers. Those placeholders were removed from the template. No real environment file was changed.

### Assets and data files

- `web/public/icon.svg`, `manifest.webmanifest`, `privacy.html`, `terms.html` are wired to the web/PWA shell.
- Android splash and launcher assets under `mobile/android/app/src/main/res/` are referenced by Android resources/manifest and must remain.
- No local pose `.task`, TFLite, ONNX or other model file is checked into the product; model URL is configured in the detector.
- PostgreSQL schema is `backend/src/db/schema.sql`; `render.yaml` configures the managed database. No standalone local database file is the production source.

## Tests and benchmarks

- Backend integration/flow tests: `backend/test/*.test.js`.
- Web logic tests: `web/src/**/*.test.js`.
- Shared catalog tests: `shared/*.test.mjs`.
- Movement benchmark: `benchmark/evaluate.test.mjs`, protocol and fixtures in `benchmark/`.
- Android unit tests: currently located under the parallel Kotlin implementation; they must be retained only if that implementation remains.

## Pre-cleanup decisions

| Item | Evidence | Disposition |
| --- | --- | --- |
| `hs_err_pid16320.log` | JVM fatal-error report, ignored by Git (`*.log`), no source/config references | Removed after snapshot; not runtime input |
| `backend/src/db/database.js` | No external imports or symbol consumers; duplicate store APIs exist in `lib/store.js` | Removed after snapshot; regression suite passes |
| `ai/` engine plus `shared/verificationTypes.mjs` | Only internal imports; not wired to current app/build/tests; overlaps active workout analysis | Removed after snapshot; updated current architecture/audit docs and guide |
| `backend/.env.example` blockchain keys | No runtime references | Removed placeholders from template; real local env files untouched |
| Kotlin native Android client | Full competing implementation, duplicate `MainActivity` FQCN with Capacitor activity; Gradle compile result unavailable due JVM/command-channel failure | Preserved because deletion could remove a substantial implementation; tracked as unresolved build conflict |
| Blockchain browser/server implementation | Already absent from working tree and staged as deleted before this audit; no production imports remain | Preserve current removal; retain isolated backend integrity hashes |
| Android resources, Gradle wrapper, lockfiles, CDN model reference | Build/runtime/config references exist | Keep |

The pre-cleanup restore snapshot is outside this repository at `C:\Users\nisha\Desktop\BlockFit_pre_cleanup_20261005`. It excludes only `.git` internals and regenerable dependency/build output; it includes source/config and local environment files. Git has no configured author, so no baseline commit was created under an invented identity. The Android check did not produce a reliable task result; do not treat Android build as passing.
