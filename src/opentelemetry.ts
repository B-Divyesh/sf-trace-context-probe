import { context, trace } from '@opentelemetry/api';
import { createTraceProbe } from './probe.js';
import type { CreateTraceProbeOptions, TraceProbe } from './types.js';

export interface OpenTelemetryProbeOptions extends Omit<CreateTraceProbeOptions, 'readContext'> {}

/** Create a probe using only OpenTelemetry's public context and trace APIs. */
export function createOpenTelemetryProbe(options: OpenTelemetryProbeOptions = {}): TraceProbe {
  return createTraceProbe({
    ...options,
    readContext() {
      const span = trace.getSpan(context.active());
      if (!span) return undefined;
      const spanContext = span.spanContext();
      return { traceId: spanContext.traceId, spanId: spanContext.spanId };
    },
  });
}
