export interface TraceContext {
  traceId: string;
  spanId: string;
}

export type BoundaryStatus =
  | 'root'
  | 'preserved'
  | 'lost'
  | 'mismatch'
  | 'unobserved'
  | 'error';

export interface ProbeToken {
  readonly id: string;
  readonly context?: TraceContext;
}

export interface BoundaryOptions {
  /** Context or earlier boundary whose observed context should still be active. */
  expect?: ProbeToken | TraceContext;
  /** Earlier boundary to draw as the structural parent. Defaults to `expect` when it is a token. */
  parent?: ProbeToken;
  /** Short diagnostic note. Do not place payload or request data here. */
  note?: string;
}

export interface ProbeBoundary {
  id: string;
  name: string;
  parentId?: string;
  expected?: TraceContext;
  observed?: TraceContext;
  status: BoundaryStatus;
  elapsedMs: number;
  note?: string;
  error?: string;
}

export interface ProbeSummary {
  total: number;
  preserved: number;
  broken: number;
  unobserved: number;
}

export interface ProbeReport {
  schemaVersion: 1;
  session: string;
  generatedAt: string;
  ok: boolean;
  firstBrokenBoundary?: ProbeBoundary;
  summary: ProbeSummary;
  boundaries: ProbeBoundary[];
}

export interface CreateTraceProbeOptions {
  name?: string;
  readContext: () => TraceContext | undefined;
  now?: () => number;
  wallClock?: () => Date;
}

export interface TraceProbe {
  mark(name: string, options?: BoundaryOptions): ProbeToken;
  wrap<Args extends unknown[], Result>(
    name: string,
    options: BoundaryOptions,
    callback: (...args: Args) => Result,
  ): (...args: Args) => Result;
  report(): ProbeReport;
  reset(): void;
}
