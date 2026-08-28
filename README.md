# Trace Context Probe

Find the first async boundary where a Node.js trace stops matching its expected lineage—before telemetry leaves the process.

Trace Context Probe is a zero-runtime-dependency TypeScript library and CLI for Node.js teams instrumenting callbacks, queues, timers, streams, and frameworks with OpenTelemetry. It records only boundary names plus trace/span IDs: never request bodies, attributes, or payloads.

## Install

```sh
npm install --save-dev trace-context-probe
```

Node 18+ is supported. The optional OpenTelemetry adapter supports `@opentelemetry/api` 1.7–1.x.

## Usage

Pass a public context reader to the stable core. A `mark` checks context immediately; `wrap` checks it when a callback actually runs.

```ts
import { createTraceProbe } from 'trace-context-probe';
import { context, trace } from '@opentelemetry/api';

const probe = createTraceProbe({
  name: 'checkout-worker',
  readContext() {
    const span = trace.getSpan(context.active());
    if (!span) return undefined;
    const { traceId, spanId } = span.spanContext();
    return { traceId, spanId };
  },
});

const request = probe.mark('http.request');
const onMessage = probe.wrap('queue.consume', { expect: request }, async () => {
  // Your handler is unchanged. The probe observes; it never repairs context.
});

queue.consume(onMessage);

const report = probe.report();
if (!report.ok) {
  console.error(`First broken boundary: ${report.firstBrokenBoundary?.name}`);
}
```

Or use the adapter, which relies only on the public OpenTelemetry API:

```ts
import { createOpenTelemetryProbe } from 'trace-context-probe/opentelemetry';

const probe = createOpenTelemetryProbe({ name: 'checkout-worker' });
```

Write a JSON snapshot and turn it into a standalone, accessible HTML graph:

```ts
import { writeFile } from 'node:fs/promises';
import { renderHtml } from 'trace-context-probe';

await writeFile('trace-context-report.json', JSON.stringify(probe.report(), null, 2));
await writeFile('trace-context-report.html', renderHtml(probe.report()));
```

```sh
npx trace-context-probe report trace-context-report.json --output trace-context-report.html
npx trace-context-probe report trace-context-report.json --json
```

Use `--fail-on-loss` to return exit code 2 when a broken boundary is present. Invalid input or CLI usage returns exit code 1. The CLI never prompts.

## API

- `createTraceProbe(options)` creates an isolated probe session.
- `probe.mark(name, { expect?, parent?, note? })` records the active context now and returns a token usable as a later expectation.
- `probe.wrap(name, { expect?, parent?, note? }, callback)` records when the callback runs without binding or changing context.
- `probe.report()` returns a serializable schema-v1 report with the exact first broken boundary.
- `renderHtml(report)` returns a standalone propagation graph with no scripts or remote assets.
- `formatDot(report)` returns a Graphviz DOT representation.

An expected token compares both `traceId` and `spanId`. Pass an explicit `{ traceId, spanId }` when the expected parent is known independently. If there is no active context at the first mark, it is reported as `unobserved`; later expected-but-missing contexts are `lost`.

## Compatibility

| Component | Supported | Notes |
| --- | --- | --- |
| Node.js | 18, 20, 22, 24 | ESM and CommonJS builds |
| TypeScript | 5.2+ | bundled declarations |
| `@opentelemetry/api` | 1.7–1.x | optional peer; public `context` and `trace` APIs only |
| SDK/exporter vendors | any | core does not import SDKs or exporters |

No private `AsyncLocalStorage`, SDK, span, or context-manager fields are accessed.

## CLI help

```sh
npx trace-context-probe --help
```

The JSON input is the direct output of `probe.report()`. HTML output is self-contained and safe to open offline.

## Develop and verify

```sh
npm ci
npm test
npm run build        # package -> dist/library; site -> dist/site
npm run test:e2e
npm pack --dry-run
```

Run the docs site locally with `npm run dev`. The static deployment root is `dist/site`.

## Privacy

The library has no telemetry, networking, persistence, or runtime dependencies. Reports contain the session name, boundary names, minimal trace/span identifiers, statuses, and relative timing. The documentation demo is local-only and stores nothing.

## License

MIT. See [LICENSE](LICENSE).
