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
