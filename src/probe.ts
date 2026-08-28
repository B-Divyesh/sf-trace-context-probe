import type {
  BoundaryOptions,
  BoundaryStatus,
  CreateTraceProbeOptions,
  ProbeBoundary,
  ProbeReport,
  ProbeToken,
  TraceContext,
  TraceProbe,
} from './types.js';

const BROKEN = new Set<BoundaryStatus>(['lost', 'mismatch', 'unobserved', 'error']);

function copyContext(value: TraceContext | undefined): TraceContext | undefined {
  return value ? { traceId: value.traceId, spanId: value.spanId } : undefined;
}

function isToken(value: ProbeToken | TraceContext): value is ProbeToken {
  return 'id' in value;
}

function expectedContext(options: BoundaryOptions): TraceContext | undefined {
  if (!options.expect) return undefined;
  return copyContext(isToken(options.expect) ? options.expect.context : options.expect);
}

function contextsEqual(left: TraceContext, right: TraceContext): boolean {
  return left.traceId === right.traceId && left.spanId === right.spanId;
}

function statusFor(expected: TraceContext | undefined, observed: TraceContext | undefined): BoundaryStatus {
  if (!expected) return observed ? 'root' : 'unobserved';
  if (!observed) return 'lost';
  return contextsEqual(expected, observed) ? 'preserved' : 'mismatch';
}

function safeName(name: string): string {
  const normalized = name.trim();
  if (!normalized) throw new TypeError('Boundary name must not be empty.');
  if (normalized.length > 120) throw new TypeError('Boundary name must be 120 characters or fewer.');
  return normalized;
}

export function createTraceProbe(options: CreateTraceProbeOptions): TraceProbe {
  if (typeof options?.readContext !== 'function') {
    throw new TypeError('createTraceProbe requires a readContext function.');
  }

  const session = options.name?.trim() || 'trace-context-probe';
  const now = options.now ?? (() => performance.now());
  const wallClock = options.wallClock ?? (() => new Date());
  let startedAt = now();
  let counter = 0;
  let boundaries: ProbeBoundary[] = [];

  function mark(name: string, boundaryOptions: BoundaryOptions = {}): ProbeToken {
    const id = `boundary-${++counter}`;
    const expected = expectedContext(boundaryOptions);
    let observed: TraceContext | undefined;
    let error: string | undefined;

    try {
      observed = copyContext(options.readContext());
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Context reader threw a non-Error value.';
    }

    const parentId = boundaryOptions.parent?.id
      ?? (boundaryOptions.expect && isToken(boundaryOptions.expect) ? boundaryOptions.expect.id : undefined);
    const boundary: ProbeBoundary = {
      id,
      name: safeName(name),
      ...(parentId ? { parentId } : {}),
      ...(expected ? { expected } : {}),
      ...(observed ? { observed } : {}),
      status: error ? 'error' : statusFor(expected, observed),
      elapsedMs: Math.max(0, Math.round((now() - startedAt) * 100) / 100),
      ...(boundaryOptions.note ? { note: boundaryOptions.note.slice(0, 240) } : {}),
      ...(error ? { error: error.slice(0, 240) } : {}),
    };
    boundaries.push(boundary);
    return Object.freeze({ id, ...(observed ? { context: copyContext(observed) } : {}) });
  }

  return {
    mark,
    wrap<Args extends unknown[], Result>(
      name: string,
      boundaryOptions: BoundaryOptions,
      callback: (...args: Args) => Result,
    ) {
      if (typeof callback !== 'function') throw new TypeError('wrap requires a callback function.');
      return function probedCallback(this: unknown, ...args: Args): Result {
        mark(name, boundaryOptions);
        return callback.apply(this, args);
      };
    },
    report() {
      const snapshot = boundaries.map((boundary) => structuredClone(boundary));
      const firstBrokenBoundary = snapshot.find((boundary) => BROKEN.has(boundary.status));
      return {
        schemaVersion: 1,
        session,
        generatedAt: wallClock().toISOString(),
        ok: !firstBrokenBoundary,
        ...(firstBrokenBoundary ? { firstBrokenBoundary } : {}),
        summary: {
          total: snapshot.length,
          preserved: snapshot.filter((boundary) => boundary.status === 'preserved' || boundary.status === 'root').length,
          broken: snapshot.filter((boundary) => boundary.status === 'lost' || boundary.status === 'mismatch' || boundary.status === 'error').length,
          unobserved: snapshot.filter((boundary) => boundary.status === 'unobserved').length,
        },
        boundaries: snapshot,
      } satisfies ProbeReport;
    },
    reset() {
      boundaries = [];
      counter = 0;
      startedAt = now();
    },
  };
}
