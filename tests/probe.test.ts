import { describe, expect, it } from 'vitest';
import { createTraceProbe, formatDot, renderHtml, type TraceContext } from '../src/index';

const rootContext: TraceContext = {
  traceId: '11111111111111111111111111111111',
  spanId: '2222222222222222',
};

describe('createTraceProbe', () => {
  it('covers the documented mark and wrap flow', () => {
    let active: TraceContext | undefined = rootContext;
    const probe = createTraceProbe({
      name: 'checkout-worker',
      readContext: () => active,
      now: () => 10,
      wallClock: () => new Date('2026-08-28T00:00:00.000Z'),
    });

    const request = probe.mark('http.request');
    const handler = probe.wrap('queue.consume', { expect: request }, () => 'handled');
    expect(handler()).toBe('handled');
    expect(probe.report()).toMatchObject({
      ok: true,
      summary: { total: 2, preserved: 2, broken: 0, unobserved: 0 },
      boundaries: [
        { name: 'http.request', status: 'root' },
        { name: 'queue.consume', status: 'preserved', expected: rootContext, observed: rootContext },
      ],
    });

    active = undefined;
  });

  it('reports the exact first lost boundary and keeps later noise secondary', () => {
    let active: TraceContext | undefined = rootContext;
    const probe = createTraceProbe({ readContext: () => active });
    const root = probe.mark('request');
    active = undefined;
    const lost = probe.mark('queue.consume', { expect: root });
    probe.mark('downstream.log', { expect: root, parent: lost });

    expect(probe.report().firstBrokenBoundary).toMatchObject({ name: 'queue.consume', status: 'lost' });
    expect(probe.report().summary.broken).toBe(2);
  });

  it('distinguishes a mismatched span from missing context', () => {
    let active: TraceContext | undefined = rootContext;
    const probe = createTraceProbe({ readContext: () => active });
    const root = probe.mark('request');
    active = { ...rootContext, spanId: '3333333333333333' };
    probe.mark('foreign.callback', { expect: root });

    expect(probe.report().firstBrokenBoundary?.status).toBe('mismatch');
  });

  it('turns context-reader errors into useful report state', () => {
    const probe = createTraceProbe({ readContext: () => { throw new Error('manager unavailable'); } });
    probe.mark('framework.enter');
    expect(probe.report().firstBrokenBoundary).toMatchObject({
      name: 'framework.enter', status: 'error', error: 'manager unavailable',
    });
  });

  it('validates boundary names and can reset a session', () => {
    const probe = createTraceProbe({ readContext: () => rootContext });
    expect(() => probe.mark('   ')).toThrow('Boundary name must not be empty');
    probe.mark('request');
    probe.reset();
    expect(probe.report().boundaries).toEqual([]);
  });
});

describe('reporters', () => {
  it('renders standalone, accessible HTML and escapes report labels', () => {
    const probe = createTraceProbe({ name: '<script>alert(1)</script>', readContext: () => rootContext });
    probe.mark('<img src=x onerror=alert(1)>');
    const html = renderHtml(probe.report());
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('<main>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  it('renders an explicit empty state', () => {
    const probe = createTraceProbe({ readContext: () => rootContext });
    expect(renderHtml(probe.report())).toContain('No boundaries recorded.');
  });

  it('emits a Graphviz edge for parented boundaries', () => {
    const probe = createTraceProbe({ readContext: () => rootContext });
    const root = probe.mark('request');
    probe.mark('timer.fire', { expect: root });
    expect(formatDot(probe.report())).toContain('"boundary-1" -> "boundary-2"');
  });
});
