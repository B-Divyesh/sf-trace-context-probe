import { AsyncLocalStorage } from 'node:async_hooks';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { createTraceProbe, type TraceContext } from '../src/index';

const context: TraceContext = {
  traceId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  spanId: 'bbbbbbbbbbbbbbbb',
};

type ExitContext = <Result>(task: () => Result) => Result;
type BreakFixture = (runOutside: ExitContext, wrapped: () => void) => Promise<void>;

const fixtures: Array<{ name: string; boundary: string; schedule: BreakFixture }> = [
  {
    name: 'callback', boundary: 'callback.invoke',
    schedule: async (outside, wrapped) => { outside(wrapped); },
  },
  {
    name: 'timer', boundary: 'timer.fire',
    schedule: (outside, wrapped) => new Promise((resolve) => outside(() => setTimeout(() => { wrapped(); resolve(); }, 0))),
  },
  {
    name: 'queue', boundary: 'queue.consume',
    schedule: (outside, wrapped) => new Promise((resolve) => {
      const queue = new EventEmitter();
      queue.once('message', () => { wrapped(); resolve(); });
      outside(() => queue.emit('message'));
    }),
  },
  {
    name: 'stream', boundary: 'stream.transform',
    schedule: (outside, wrapped) => new Promise((resolve) => {
      const stream = new PassThrough();
      stream.once('data', () => { wrapped(); resolve(); });
      outside(() => stream.write('chunk'));
    }),
  },
  {
    name: 'framework', boundary: 'framework.middleware',
    schedule: async (outside, wrapped) => {
      const middleware = (next: () => void) => outside(next);
      middleware(wrapped);
    },
  },
];

describe('five intentionally broken async boundaries', () => {
  it.each(fixtures)('reports $boundary as the exact first break ($name)', async ({ boundary, schedule }) => {
    const storage = new AsyncLocalStorage<TraceContext>();
    const probe = createTraceProbe({ name: `${boundary} fixture`, readContext: () => storage.getStore() });

    await storage.run(context, async () => {
      const root = probe.mark('http.request');
      const prepared = probe.mark('instrumentation.ready', { expect: root });
      const wrapped = probe.wrap(boundary, { expect: root, parent: prepared }, () => undefined);
      const exit: ExitContext = (task) => storage.exit(task);
      await schedule(exit, wrapped);
    });

    const report = probe.report();
    expect(report.ok).toBe(false);
    expect(report.firstBrokenBoundary).toMatchObject({ name: boundary, status: 'lost' });
  });
});
