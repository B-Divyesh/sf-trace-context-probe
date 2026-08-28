# Trace Context Probe — independent verification 2

**Result: PASS**

Verified on 2026-08-28 for work order `trace-context-probe-verify-2`.

- Candidate commit: `0d729903f6566fe825e0dba4c0b82e7e588d87f6`
- Repository: `https://github.com/B-Divyesh/sf-trace-context-probe.git` (`main`)
- Live URL: `https://trace-context-probe.sociobot.in/`
- Verification environment: clean checkout at the candidate commit; Node 22.23.2; Chromium supplied for Playwright 1.58.2.

The earlier deployment-only failures are resolved in fresh evidence. The live release is byte-identical to this candidate's production build for the sampled application artifacts, and the browser policy is now present in production.

## Local quality gates

| Check | Result |
| --- | --- |
| `npm ci` | Passed; 96 packages installed; `npm audit --audit-level=low` reported 0 vulnerabilities. |
| `npm test` | Passed: 3 files, 14 tests. |
| `npm run typecheck` | Passed (`tsc --noEmit`). |
| Lint | No lint script or lint configuration exists in this repository, so there was no separate lint command to run. |
| `npm run build` | Passed; produced `dist/library` and `dist/site`. |
| `npm run test:e2e` | Passed: 10/10 Chromium tests against the production build. |
| `npm pack --json` | Passed: 22 files, 19,264-byte tarball, 149,129 bytes unpacked, no bundled dependencies. |

The Node fixtures exercise all five required real `AsyncLocalStorage` loss cases and locate the exact first boundary: `callback.invoke`, `timer.fire`, `queue.consume`, `stream.transform`, and `framework.middleware`.

## Packaged consumer and CLI

A tarball from the production build was installed into a newly initialized temporary consumer with `@opentelemetry/api@1.9.0`.

- ESM public API reported `timer.fire` as the first `lost` boundary; HTML and DOT renderers included that boundary.
- CommonJS `require` reported a changed span as `mismatch`.
- The optional `trace-context-probe/opentelemetry` adapter imported and marked a boundary through its public API.
- A 120-character boundary name was accepted; 121 characters was rejected.
- The packaged CLI generated standalone HTML, returned exit **2** for `--json --fail-on-loss` on the lost report, exit **0** for HTML output and `--help`, and exit **1** with useful messages for malformed JSON and a missing input file.

Nothing was published. `npm pack` remains the publishing-ready command.

## Live application and accessibility

Fresh Playwright checks ran against the live HTTPS URL at 1440 × 900 and 390 × 844.

- Both viewports have the correct title, `lang="en"`, exactly one `h1`, exactly one `main`, and a meaningful hero-image alt text.
- Running the local fixture suite reported **5 / 5 exact first boundaries**. Each of callback, timer, queue, stream, and framework was selected and confirmed independently. Native radio arrow-key navigation moved callback to timer.
- Keyboard-only skip navigation is repaired: Tab focused the visible skip link with a 3px focus outline, Enter focused `main`, and the following Tab entered the first main-content copy button. This passed in both viewports.
- Every button measured at least 44px high; document width remained equal to viewport width at 390px after results rendered. Copy feedback successfully wrote the install command and announced “Copied to clipboard”.
- No page errors or console errors occurred. Axe found **0 serious or critical** violations after the fixture run in each viewport.
- With `prefers-reduced-motion: reduce`, the animated hero's computed animation and transition durations were `1e-05s` and scrolling was `auto`.
- The live service worker was controlling the page. Its public cache was `trace-context-probe-v2`; an actual offline reload showed the local-only offline notice and reran the five fixtures in both viewport profiles. The service worker is update-ready: `/sw.js` is served `Cache-Control: no-cache`, and its versioned-cache source uses `skipWaiting`, `clients.claim`, and stale-cache cleanup. An upgrade from an older deployed worker could not be manufactured without changing deployment state.

## Privacy, policies, deployment identity, and performance

Browser captures recorded eight initial/session requests per viewport, all to `https://trace-context-probe.sociobot.in`; no third-party scripts, fonts, analytics, or telemetry requests occurred. Source review found no runtime networking, request-body capture, private OpenTelemetry fields, storage APIs, or CDN assets. In a fresh browser the site had no local-storage keys, session-storage keys, cookies, or IndexedDB databases. The only persistence was the public service-worker shell cache.

Live response policy was confirmed directly:

- HTML: `Cache-Control: public, must-revalidate, max-age=30`.
- Hashed JS, hashed CSS, and `hero-diorama.webp`: `Cache-Control: public, max-age=31536000, immutable`.
- `sw.js`: `Cache-Control: no-cache`.
- All checked responses emitted `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `X-Content-Type-Options: nosniff`, and HSTS.

| Artifact | SHA-256, local production build and live |
| --- | --- |
| `index.html` | `be42c2e39f85282a29aceeca453196eed6a157eed8233e333c37b450f003d0e8` |
| `assets/index-C9A-cYPE.js` | `aaa96737710e748b9c05cae6aa74fa99c84c58b522c28b129495a4c95ec223b5` |
| `assets/index-oTJfe-g8.css` | `cc252a1fe4a09a8b2293c37577f932151af8b9d9cd1a041ab64d8e474acd1949` |
| `sw.js` | `945cbd5cdf1d131db6511887c585f6032f8430fc99a9cc3023b1483a710e709f` |
| `hero-diorama.webp` | `cb608f089cce949fa62f2235741f8aad9c08952036cc20a0303ec767d77e20ba` |

The static asset budgets pass: JS 7,021 bytes (3,073 gzip), CSS 14,992 bytes (4,168 gzip), and original WebP hero 40,960 bytes. Lighthouse mobile against the live URL scored Performance **99**, Accessibility **100**, Best Practices **100**, and SEO **100**; FCP 1.6s, LCP 1.6s, TBT 20ms, CLS 0, and interactive 1.7s.

## Defects

None found. No release-blocking, high, medium, low, or informational defects remain from this verification.

