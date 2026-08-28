# Trace Context Probe — independent verification 1

**Result: FAIL**

Verified on 2026-08-28 for work order `trace-context-probe-verify-1`.

- Candidate commit: `8f41b4cdf47196be4d1c17811f095772b7c4b22d`
- Candidate repository: `https://github.com/B-Divyesh/sf-trace-context-probe.git` (`main`)
- Live URL: `https://trace-context-probe.sociobot.in/`
- Test environment: clean checkout at the candidate commit; Node/npm environment supplied by the factory worker.

The library and the deployed application function correctly. The release nevertheless fails the acceptance contract because a keyboard accessibility defect remains and the deployed response/cache policy does not match the candidate's authored policy. These are described below with fresh, reproducible evidence.

## Release-blocking defects

### Medium — skip link does not move keyboard focus to main

At both the deployed desktop page (1440 × 900) and the production static build, pressing `Tab` focuses **Skip to main content**. Pressing `Enter` scrolls to `#main`, but `document.activeElement !== main` afterwards. `<main id="main">` is not focusable. The next `Tab` therefore resumes in the header rather than at the main content; keyboard users cannot actually skip the header controls.

Evidence from an independent Playwright desktop run against the live URL:

```json
{"skip":true,"mainFocused":false,"errors":[],"scrollWidth":1440,"innerWidth":1440}
```

This violates the keyboard-only/skip-navigation requirement despite the visible skip-link styling and the zero serious/critical axe result. Make the landmark programmatically focusable when targeted (for example, `tabindex="-1"` on `main`) and verify focus transfer.

### Medium — deployment ignores the authored cache and response policy

`site/public/_headers` specifies immutable one-year caching for `/assets/*` and `/hero-diorama.webp`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, and a restrictive `Permissions-Policy`. The live server returned the following for the hashed JS, CSS, HTML, and service worker instead:

```text
cache-control: public, must-revalidate, max-age=30
referrer-policy: strict-origin-when-cross-origin
x-content-type-options: nosniff
strict-transport-security: max-age=10886400; includeSubDomains; preload
```

It omitted `X-Frame-Options` and `Permissions-Policy`; static assets were neither immutable nor long-lived. This misses the required immutable-cache policy for hashed build assets and the candidate's stated browser response policies. Configure the deployment/static host to honor the generated `_headers` file (or provision equivalent host configuration), then recheck the live response headers. This is a deployment configuration defect, not a stale-content discrepancy.

## Passed verification

### Clean install, quality gates, and package

| Check | Fresh result |
| --- | --- |
| `npm ci` | Passed; 96 packages installed; audit reported 0 vulnerabilities. |
| `npm test` | Passed: 2 files, 13 tests. Includes all five real Node `AsyncLocalStorage` loss fixtures: callback, timer, EventEmitter queue, stream, and framework middleware. |
| `npm run typecheck` | Passed (`tsc --noEmit`). |
| Lint | No lint script/configuration is present in `package.json`; no lint command was available to run. |
| `npm run build` | Passed. Generated `dist/library` and `dist/site`. |
| `npm run test:e2e` | Passed: 8/8 Chromium tests across desktop and 390 × 844 mobile. |
| `npm audit --audit-level=low` | Passed: 0 vulnerabilities. |
| `npm pack --json` | Passed: 22 files, 19,264-byte tarball, 149,129 bytes unpacked, no bundled dependencies. |

The production site bundle is within the stated budgets: JS 7,021 bytes (3,073 gzip), CSS 14,992 bytes (4,168 gzip), hero WebP 40,960 bytes, and HTML 9,815 bytes. There are no third-party fonts or scripts; the source uses only system fonts and the original local WebP asset.

The tarball was installed into a newly initialized empty consumer project. Independent public-surface checks passed:

- ESM import: a normal root/preserved/lost flow returned `timer.fire` as the exact first `lost` boundary; HTML and DOT renderers included it.
- CommonJS `require`: a differing span ID reported `mismatch`.
- Optional `trace-context-probe/opentelemetry` adapter was installed with `@opentelemetry/api@1.9.0` and executed through its public API.
- Boundary input validation accepted 120 characters and rejected blank and 121-character names.
- CLI generated standalone HTML, returned exit code **2** for `--json --fail-on-loss` on a lost `queue.consume` boundary, and returned exit code **1** with useful messages for a missing file and malformed JSON report.

### End-to-end product behavior

Against the production static build, the live five-case suite correctly reported the first loss at each required boundary:

| Fixture | Exact first break |
| --- | --- |
| Callback | `callback.invoke` |
| Timer | `timer.fire` |
| Queue | `queue.consume` |
| Stream | `stream.transform` |
| Framework | `framework.middleware` |

The 390 px view has no horizontal document overflow (`scrollWidth === innerWidth === 390`). Native keyboard arrow navigation changed the selected scenario from `callback` to `timer`; buttons, radios, and copy controls have visible focus styles. With `prefers-reduced-motion: reduce`, measured animation and transition durations were `0.00001s`.

Service-worker behavior passed from the production build and live deployment: after activation and a controlled reload, an offline reload displayed the local-only offline notice and reran all five fixtures successfully. Live mobile evidence recorded `serviceWorker: "https://trace-context-probe.sociobot.in/sw.js"`, `offline: true`, `scrollWidth: 390`, and `innerWidth: 390`.

### Accessibility, privacy, and runtime behavior

- Axe found **0 serious or critical** violations after running the fixture suite on both desktop and 390 px mobile.
- Desktop and mobile checks found one title, `lang="en"`, one `<h1>`, one `<main>`, hero alt text, no page errors, and no console errors.
- Browser captures of the live first-load/session requests (12 requests) were all same-origin. Source review found no analytics, telemetry, storage APIs, cookies, request-body capture, CDN fonts, or third-party runtime scripts. The service worker fetches only same-origin GET requests for offline caching.
- The product stores no user data and takes no payment, so `/privacy` and `/terms` pages are not required by the repository contract.

### Deployment identity

The live deployment matches the candidate byte-for-byte for the sampled release files:

| File | SHA-256 (live and candidate build) |
| --- | --- |
| `index.html` | `4e088d4839d4e4c5e7b01c66378f1b34f708312700c24eca9d7232cf618b2015` |
| `assets/index-C9A-cYPE.js` | `aaa96737710e748b9c05cae6aa74fa99c84c58b522c28b129495a4c95ec223b5` |
| `assets/index-oTJfe-g8.css` | `cc252a1fe4a09a8b2293c37577f932151af8b9d9cd1a041ab64d8e474acd1949` |
| `sw.js` | `945cbd5cdf1d131db6511887c585f6032f8430fc99a9cc3023b1483a710e709f` |

The live root returned HTTP 200 and the same `index.html` size (9,815 bytes). The mismatch is limited to host response/cache configuration, not the deployed candidate content.

## Retest criteria

1. Correct skip-link focus transfer and confirm it at desktop and 390 px with keyboard-only Playwright checks.
2. Configure the static host to serve immutable one-year caching for hashed assets and the hero; emit `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, and the declared `Permissions-Policy`; then capture the live headers again.
3. Rerun the quality gates and the live browser smoke test. No product-code change was made during this verification.
