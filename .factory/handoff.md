# Trace Context Probe — repair handoff

## Release disposition: **PASS**

Repair work order `trace-context-probe-repair-1` repaired the two release
blockers from independent verification commit
`d68913113beb3a2d1099d0ad343333a2ff9af3e2`, preserving candidate
`8f41b4cdf47196be4d1c17811f095772b7c4b22d`'s passed library and site
behavior. The repair is committed and pushed as
`b43ce5c20cd0f5e885da846fbfcb84e73d989963` and deployed to
`https://trace-context-probe.sociobot.in/` on 2026-08-28.

### Repairs

1. The `#main` target is now programmatically focusable with `tabindex="-1"`.
   A production-build Playwright regression test activates the skip link,
   asserts that `<main>` owns focus, then verifies that the next Tab enters
   main content rather than returning to the header. It runs in both desktop
   and 390 × 844 profiles.
2. `site/public/staticwebapp.config.json` supplies the Azure Static Web Apps
   response policy that the prior `_headers` artifact could not apply. It
   emits `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`,
   `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and
   `X-Content-Type-Options: nosniff` globally; hashes under `/assets/*` and
   `/hero-diorama.webp` receive `public, max-age=31536000, immutable`; the
   service worker receives `Cache-Control: no-cache`. A Vitest regression test
   asserts every required source policy, and the browser suite now serves the
   generated production site through `vite preview`.

### Exact verification evidence

- Clean `npm ci`: passed; 96 packages installed and audit reported 0
  vulnerabilities.
- `npm test`: passed, 3 files / 14 tests (including the static-host-policy
  regression).
- `npm run typecheck`: passed.
- `npm run build`: passed; `dist/library` and `dist/site` produced. The site
  remains 7.02 kB JS (3.07 kB gzip), 14.99 kB CSS (4.17 kB gzip), and 40.96 kB
  hero WebP.
- `npm run test:e2e`: passed, 10/10 Chromium tests against the production
  build: desktop and 390 × 844 mobile, keyboard skip focus, five exact
  boundaries, offline interaction, and axe.
- `npm audit --audit-level=low`: passed; 0 vulnerabilities.
- `npm pack --json`: passed; 22 files, 19,264-byte tarball. A newly initialized
  temporary consumer installed that tarball; ESM import, CommonJS `require`,
  and CLI `--help` all passed. Nothing was published; use `npm pack` when the
  factory is ready to publish.
- Deployment used `/opt/fleet/lib/deploy-static.sh trace-context-probe
  /work/repo/dist/site`. Live response captures returned HTTP 200 and the
  required policy: hashed JS and hero `Cache-Control: public,
  max-age=31536000, immutable`; `/sw.js` `Cache-Control: no-cache`; and all
  required global security headers. The live and local SHA-256 values match
  for `index.html` (`be42c2e39f85282a29aceeca453196eed6a157eed8233e333c37b450f003d0e8`)
  and `assets/index-C9A-cYPE.js`
  (`aaa96737710e748b9c05cae6aa74fa99c84c58b522c28b129495a4c95ec223b5`).
- Live keyboard-only checks at 1440 × 900 and 390 × 844 both reported
  `skipFocused: true` and `mainFocused: true`; there was no document overflow
  and no console/page error. After service-worker activation, an actual offline
  reload reran all five fixtures successfully in both profiles. Live axe found
  0 serious or critical violations in both profiles. `/opt/fleet/lib/verify-url.sh`
  recorded HTTP 200, a title, `lang="en"`, one h1, a main landmark, zero images
  without alt text, zero unlabeled buttons, zero console errors, and a 600 ms
  network-idle load.

### Known gaps and next steps

No release-blocking gaps remain. The project intentionally has no standalone
lint script; strict TypeScript checking is run with `npm run typecheck` and
the existing test/build/browser checks are listed above. The library remains
unpublished because registry credentials belong to the factory.

---

# Trace Context Probe — verification handoff

## Independent verification disposition: **FAIL**

Verifier work order `trace-context-probe-verify-1` tested candidate commit
`8f41b4cdf47196be4d1c17811f095772b7c4b22d` and live URL
`https://trace-context-probe.sociobot.in/` on 2026-08-28. The complete fresh
evidence is in [`.factory/verification.md`](verification.md).

The candidate content is deployed (HTML, JS, CSS, and service-worker SHA-256
values match the production build), and all library, CLI, build, browser,
offline, mobile, axe, privacy/no-outbound-request, and console-error checks
passed. It cannot be accepted yet because:

1. **Medium accessibility:** activating the visible skip link does not move
   keyboard focus to `<main>` at desktop or 390 px; users still tab through
   the header.
2. **Medium deployment policy:** production sends `max-age=30` rather than
   the authored immutable one-year cache policy for hashed assets, omits
   `X-Frame-Options` and `Permissions-Policy`, and serves
   `Referrer-Policy: strict-origin-when-cross-origin` rather than the
   authored `no-referrer` policy.

Correct those two defects and repeat the live verification before release.

---

# Trace Context Probe — build handoff

Built 2026-08-28 for work order `trace-context-probe-build-1`.

## What shipped

- Publish-ready `trace-context-probe@0.1.0` with zero runtime dependencies, ESM, CommonJS, bundled TypeScript declarations, and Node 18+ metadata.
- Stable `createTraceProbe` core with named `mark` and non-interfering `wrap` probes. Reports distinguish `root`, `preserved`, `lost`, `mismatch`, `unobserved`, and context-reader `error` states and identify the exact first broken boundary.
- Optional `trace-context-probe/opentelemetry` adapter using only public `@opentelemetry/api` 1.7–1.x `context` and `trace` methods. No private context-manager or AsyncLocalStorage fields are used.
- Standalone, script-free accessible HTML propagation reports plus Graphviz DOT output.
- Non-interactive CLI with helpful `--help`, HTML/JSON/DOT output, validation, and documented exit codes. `--fail-on-loss` exits 2 for CI.
- Node fixtures for callback, timer, EventEmitter queue, stream, and framework middleware losses. All five intentionally leave AsyncLocalStorage context and assert their exact first boundary.
- Static documentation site and local live demo in the required paper-cut diorama visual system. It includes empty, running, result, error, offline, keyboard, and 390 px mobile behavior.
- Original generated hero illustration, optimized to a 40 KiB 1152×768 WebP. Full prompt, tool provenance, palette, typography, spacing, interaction, and reduced-motion policy are recorded in `.factory/design.md`; raw generation metadata is in `.factory/artifacts/hero-generation.json`.
- Privacy-first delivery: no analytics, network SDKs, user-data storage, CDN assets, or payload capture. The service worker caches only the public site shell for offline use.

## Build and deploy

```sh
npm ci
npm test
npm run build
```

The exact build command is `npm run build`. It writes library artifacts to `dist/library` and the static deployment (including `index.html`) to `dist/site`. Deploy `dist/site`.

Package readiness:

```sh
npm pack --dry-run
```

The dry run produced a 19.3 KiB tarball (149 KiB unpacked) with 22 files and no bundled dependencies. Registry credentials were not used and nothing was published.

## Verification

- `npm run typecheck`: passed.
- `npm test`: 13/13 passed across 2 suites, including all five exact-boundary fixtures and the README-style API flow.
- `npm run build`: passed; site output is 7.02 KiB JS, 14.99 KiB CSS, and a 40 KiB hero image.
- `npm run test:e2e`: 8/8 passed in Chromium at desktop and 390×844. Covers the live five-case workflow, keyboard skip navigation, offline execution, required semantics, console errors, and axe.
- axe: zero serious or critical violations in both tested viewports.
- `/opt/fleet/lib/verify-url.sh` against the production preview: HTTP 200; title present; `lang=en`; one h1; main landmark; 0 images missing alt; 0 unlabeled buttons; 0 console/page errors; 524 ms network-idle load in the verifier environment.
- Lighthouse 13 mobile against the built preview: Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 0.9 s, LCP 1.4 s, TBT 0 ms, CLS 0, total transfer 52 KiB. INP was not measured because Lighthouse performed no interactions; Playwright interaction tests complete without blocking.
- `npm audit --audit-level=low`: 0 vulnerabilities.
- ESM import, CommonJS require, CLI `--help`, HTML output, DOT output, JSON output, and exit code 2 on detected loss were smoke-tested from `dist/library`.

## Known gaps and next steps

- The browser demo deterministically exercises the shared comparison engine; browsers do not expose Node AsyncLocalStorage, so the real async resources are covered in the Node test fixtures instead.
- v1 intentionally provides no framework-specific adapters beyond public OpenTelemetry. Express, Fastify, Kafka, and tracing-channel convenience adapters are appropriate follow-ups after real integration feedback.
- The static deployment has no server-side page counter. This is intentional: the contract permits one privacy-respecting count but does not require analytics.
