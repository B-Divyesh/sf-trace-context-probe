import type { ProbeBoundary, ProbeReport, TraceContext } from './types.js';

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeDot(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n');
}

function shortContext(context: TraceContext | undefined): string {
  return context ? `${context.traceId.slice(0, 8)}… / ${context.spanId.slice(0, 8)}…` : 'none';
}

function statusSymbol(boundary: ProbeBoundary): string {
  if (boundary.status === 'root' || boundary.status === 'preserved') return '✓';
  if (boundary.status === 'unobserved') return '○';
  return '×';
}

function boundaryMarkup(boundary: ProbeBoundary, index: number, firstBrokenId?: string): string {
  const isFirst = boundary.id === firstBrokenId;
  return `<li class="boundary boundary--${escapeHtml(boundary.status)}${isFirst ? ' boundary--first' : ''}">
    <div class="boundary__head"><span class="symbol" aria-hidden="true">${statusSymbol(boundary)}</span><span class="step">${index + 1}</span><strong>${escapeHtml(boundary.name)}</strong></div>
    <p class="status">${escapeHtml(boundary.status)}${isFirst ? ' · first break' : ''}</p>
    <dl>
      <div><dt>Expected</dt><dd>${escapeHtml(shortContext(boundary.expected))}</dd></div>
      <div><dt>Observed</dt><dd>${escapeHtml(shortContext(boundary.observed))}</dd></div>
      <div><dt>At</dt><dd>${escapeHtml(boundary.elapsedMs)} ms</dd></div>
    </dl>
    ${boundary.note ? `<p class="note">${escapeHtml(boundary.note)}</p>` : ''}
    ${boundary.error ? `<p class="error">Reader error: ${escapeHtml(boundary.error)}</p>` : ''}
  </li>`;
}

/** Render a complete, script-free HTML propagation graph for offline sharing. */
export function renderHtml(report: ProbeReport): string {
  const state = report.ok ? 'Context preserved' : `First break: ${report.firstBrokenBoundary?.name ?? 'unknown'}`;
  const boundaries = report.boundaries.length
    ? report.boundaries.map((boundary, index) => boundaryMarkup(boundary, index, report.firstBrokenBoundary?.id)).join('\n')
    : '<li class="empty"><strong>No boundaries recorded.</strong><span>Call probe.mark() or a wrapped callback before exporting.</span></li>';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(report.session)} — trace propagation report</title>
  <style>
    :root{--paper:#f3ead7;--surface:#fff9ec;--ink:#192e2b;--muted:#4c615c;--teal:#087f73;--rust:#a9362b;--edge:#d7c7a9;--purple:#51334e}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace}main{width:min(1120px,calc(100% - 32px));margin:auto;padding:56px 0 72px}header{max-width:760px}h1{font:700 clamp(2rem,6vw,4.75rem)/.98 Georgia,Cambria,serif;letter-spacing:-.04em;margin:8px 0 20px}.eyebrow{text-transform:uppercase;letter-spacing:.12em;font-size:.78rem;color:var(--muted)}.summary{display:inline-flex;align-items:center;min-height:44px;padding:8px 14px;border:2px solid currentColor;background:var(--surface);box-shadow:4px 5px 0 var(--edge);font-weight:700}.summary--bad{color:var(--rust)}.meta{color:var(--muted);max-width:68ch}.graph{list-style:none;padding:24px 0 0;margin:32px 0;display:grid;grid-template-columns:repeat(${Math.max(1, Math.min(4, report.boundaries.length))},minmax(0,1fr));gap:24px}.boundary{position:relative;min-width:0;padding:20px 18px;background:var(--surface);border:2px solid var(--ink);box-shadow:5px 6px 0 var(--edge)}.boundary:not(:last-child)::after{content:"";position:absolute;z-index:-1;left:100%;top:34px;width:26px;border-top:4px dashed var(--teal)}.boundary--lost,.boundary--mismatch,.boundary--error{border-color:var(--rust)}.boundary--first{box-shadow:7px 8px 0 #d99e91}.boundary__head{display:grid;grid-template-columns:28px 24px 1fr;align-items:center;gap:6px}.symbol{display:grid;place-items:center;width:26px;height:26px;border:2px solid currentColor;border-radius:50%;font-weight:900}.step{color:var(--muted);font-size:.8rem}.status{text-transform:uppercase;letter-spacing:.08em;font-size:.76rem;font-weight:800;color:var(--muted)}dl{margin:18px 0 0;font-size:.8rem}dl div{border-top:1px solid var(--edge);padding:8px 0}dt{color:var(--muted)}dd{margin:2px 0 0;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}.note,.error{font-size:.84rem}.error{color:var(--rust)}.empty{grid-column:1/-1;padding:32px;border:2px dashed var(--muted);display:grid;gap:8px}footer{border-top:1px solid var(--edge);padding-top:20px;color:var(--muted);font-size:.8rem}@media(max-width:760px){main{padding-top:32px}.graph{grid-template-columns:1fr}.boundary:not(:last-child)::after{left:32px;top:100%;height:28px;width:0;border-left:4px dashed var(--teal);border-top:0}}@media(prefers-reduced-motion:no-preference){.boundary{animation:arrive .22s ease-out both}@keyframes arrive{from{opacity:0;transform:translateY(8px)}}}
  </style>
</head>
<body>
  <main>
    <header><span class="eyebrow">Trace Context Probe · schema v${report.schemaVersion}</span><h1>${escapeHtml(report.session)}</h1><p class="summary${report.ok ? '' : ' summary--bad'}">${report.ok ? '✓' : '×'}&nbsp; ${escapeHtml(state)}</p><p class="meta">${report.summary.total} boundaries · ${report.summary.preserved} preserved · ${report.summary.broken} broken · ${report.summary.unobserved} unobserved</p></header>
    <section aria-labelledby="graph-heading"><h2 id="graph-heading">Propagation graph</h2><ol class="graph">${boundaries}</ol></section>
    <footer>Generated ${escapeHtml(report.generatedAt)}. Contains boundary names and trace/span identifiers only. No runtime scripts or remote assets.</footer>
  </main>
</body>
</html>`;
}

/** Render the report as Graphviz DOT for pipeline tooling. */
export function formatDot(report: ProbeReport): string {
  const lines = [
    'digraph TraceContext {',
    '  rankdir=LR;',
    '  graph [bgcolor="transparent"];',
    '  node [shape=box, style="rounded,filled", fontname="monospace"];',
  ];
  for (const boundary of report.boundaries) {
    const good = boundary.status === 'root' || boundary.status === 'preserved';
    const label = `${boundary.name}\\n${boundary.status}\\nexpected: ${shortContext(boundary.expected)}\\nobserved: ${shortContext(boundary.observed)}`;
    lines.push(`  "${escapeDot(boundary.id)}" [label="${escapeDot(label)}", color="${good ? '#087f73' : '#a9362b'}", fillcolor="#fff9ec"];`);
    if (boundary.parentId) lines.push(`  "${escapeDot(boundary.parentId)}" -> "${escapeDot(boundary.id)}";`);
  }
  lines.push('}');
  return lines.join('\n');
}
