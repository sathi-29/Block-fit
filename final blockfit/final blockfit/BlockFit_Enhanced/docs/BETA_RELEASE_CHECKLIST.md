# BlockFit Beta Release Checklist

Status: private web beta preparation, 2026-09-19

## Gates

- [x] Phase 0 decisions frozen in `docs/DECISIONS.md`.
- [ ] Phase 1 real benchmark data collected: 10 pilot clips, two independent labels, >=90% count agreement.
- [x] Benchmark evaluator reports exact match, MAE, within-plus-or-minus-one, and temporal F1.
- [x] Authenticated workout nonce and one-time consumption implemented.
- [x] Server-side HMAC, account sequence, and audit event structures implemented.
- [x] Verification page distinguishes attested facts from limitations.
- [x] Individual revoke and account deletion tombstone behavior tested.
- [x] Network timeout, offline errors, route recovery, empty states, and camera failure messaging present.
- [x] Funnel/error analytics instrumented without blocking product flows.
- [ ] Privacy policy and terms reviewed by counsel and published with real operator contact details.
- [ ] Crash reporting provider selected and configured for production.
- [ ] Production `JWT_SECRET` and `INTEGRITY_HMAC_SECRET` configured; development fallbacks prohibited in production.

## Private beta protocol

1. Recruit 50-100 web users: athletes first, with a small coach subgroup.
2. Ask 10 users to complete the first workout without assistance; observe silently.
3. Track signup -> camera start -> completed workout -> verified record -> shared link.
4. Review exact rep-count match rate weekly against the pinned benchmark and investigate failures without tuning toward a prettier number.
5. Contact every user who abandons the first workout or deletes an account.
6. Keep a dated issue log and ship fixes before adding features.

## Launch assets still required

- Reviewed privacy policy and terms with operator identity and support contact.
- Favicon/app icon set and social preview image.
- Screenshots for the web beta invitation.
- Support and incident-response contact.
- Hosting budget and database backup/restore test.
- Monitoring alert for API error rate, database failure, and analytics ingestion failure.

## Explicitly deferred

Android device rollout, native camera optimization, clinician-reviewed program workflows, leaderboards, and social features remain post-beta decisions. They require evidence from the web beta and are not release blockers for the private web cohort.
