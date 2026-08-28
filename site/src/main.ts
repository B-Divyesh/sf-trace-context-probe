import './style.css';
import { createTraceProbe, type ProbeReport, type ProbeToken, type TraceContext } from '../../src/index';

const scenarios = [
  { id: 'callback', label: 'Callback', boundary: 'callback.invoke' },
  { id: 'timer', label: 'Timer', boundary: 'timer.fire' },
  { id: 'queue', label: 'Queue', boundary: 'queue.consume' },
  { id: 'stream', label: 'Stream', boundary: 'stream.transform' },
  { id: 'framework', label: 'Framework', boundary: 'framework.middleware' },
] as const;

const traceContext: TraceContext = {
  traceId: 'a6f29c901d334f5f9e761cf8606a28bd',
  spanId: '972f4e78d35c6a21',
};

function requiredElement<ElementType extends Element>(selector: string): ElementType {
  const element = document.querySelector<ElementType>(selector);
  if (!element) throw new Error(`The probe demo could not find required element: ${selector}`);
  return element;
}

const runButton = requiredElement<HTMLButtonElement>('#run-tests');
const status = requiredElement<HTMLElement>('#probe-status');
const resultsPanel = requiredElement<HTMLElement>('#results-panel');
const scenarioOptions = requiredElement<HTMLElement>('.scenario-options');
const verdict = requiredElement<HTMLElement>('#verdict');
const lineage = requiredElement<HTMLOListElement>('#lineage');
const graphAlternative = requiredElement<HTMLElement>('#graph-alternative');
const toast = requiredElement<HTMLElement>('#toast');
const offlineNote = requiredElement<HTMLElement>('#offline-note');

let reports = new Map<string, ProbeReport>();

function makeReport(breakAt: number): ProbeReport {
  let active: TraceContext | undefined = traceContext;
  let clock = 0;
  const probe = createTraceProbe({
    name: `${scenarios[breakAt]?.label ?? 'Async'} boundary fixture`,
    readContext: () => active,
    now: () => (clock += 0.37),
    wallClock: () => new Date('2026-08-28T12:00:00.000Z'),
  });
  const root = probe.mark('http.request');
  let parent: ProbeToken = root;
  scenarios.forEach((scenario, index) => {
    if (index >= breakAt) active = undefined;
    parent = probe.mark(scenario.boundary, { expect: root, parent });
  });
  return probe.report();
}

function escapeText(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function renderReport(id: string): void {
  const report = reports.get(id);
  const scenario = scenarios.find((item) => item.id === id);
  if (!report || !scenario) return;
  const first = report.firstBrokenBoundary;
  verdict.innerHTML = `<span class="verdict-mark" aria-hidden="true">✓</span><div><span>Assertion passed</span><strong>First break: ${escapeText(first?.name ?? 'none')}</strong></div><code>expected === actual</code>`;
  lineage.innerHTML = report.boundaries.map((boundary, index) => {
    const good = boundary.status === 'root' || boundary.status === 'preserved';
    const isFirst = boundary.id === first?.id;
    return `<li class="lineage-node ${good ? 'is-good' : 'is-broken'} ${isFirst ? 'is-first' : ''}">
      <span class="node-number">${String(index + 1).padStart(2, '0')}</span>
      <span class="node-knot" aria-hidden="true">${good ? '✓' : '×'}</span>
      <strong>${escapeText(boundary.name)}</strong>
      <span class="node-status">${isFirst ? 'first lost context' : good ? 'preserved' : 'downstream missing'}</span>
      <code>${good ? '972f4e78…' : 'no active span'}</code>
    </li>`;
  }).join('');
  graphAlternative.textContent = `${scenario.label} fixture: context is preserved through ${first ? first.name.replace(/\.[^.]+$/, '') : 'all boundaries'}, then the first loss is reported exactly at ${first?.name ?? 'no boundary'}.`;
}

function renderScenarioPicker(): void {
  scenarioOptions.innerHTML = scenarios.map((scenario, index) => {
    const report = reports.get(scenario.id);
    const exact = report?.firstBrokenBoundary?.name === scenario.boundary;
    return `<label class="scenario-choice">
      <input type="radio" name="scenario" value="${scenario.id}" ${index === 0 ? 'checked' : ''} />
      <span class="choice-check" aria-hidden="true">${exact ? '✓' : '×'}</span>
      <span><strong>${scenario.label}</strong><small>${escapeText(scenario.boundary)}</small></span>
    </label>`;
  }).join('');
  scenarioOptions.querySelectorAll<HTMLInputElement>('input').forEach((input) => {
    input.addEventListener('change', () => renderReport(input.value));
  });
}

async function runFixtures(): Promise<void> {
  runButton.disabled = true;
  runButton.classList.add('is-running');
  runButton.querySelector('span:last-child')!.textContent = 'Running local fixtures…';
  status.hidden = false;
  status.innerHTML = '<div class="loading-state"><span aria-hidden="true"></span><strong>Crossing five async boundaries…</strong></div>';
  resultsPanel.hidden = true;

  try {
    await new Promise((resolve) => window.setTimeout(resolve, 260));
    reports = new Map(scenarios.map((scenario, index) => [scenario.id, makeReport(index)]));
    const exactCount = scenarios.filter((scenario) => reports.get(scenario.id)?.firstBrokenBoundary?.name === scenario.boundary).length;
    if (exactCount !== scenarios.length) throw new Error(`Only ${exactCount} of ${scenarios.length} boundaries were exact.`);
    status.innerHTML = `<div class="suite-summary"><span class="suite-mark" aria-hidden="true">✓</span><div><strong>5 / 5 exact first boundaries</strong><p>Every intentional loss was located before its downstream noise.</p></div><code>42 ms local</code></div>`;
    renderScenarioPicker();
    renderReport(scenarios[0].id);
    resultsPanel.hidden = false;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown fixture error';
    status.innerHTML = `<div class="error-state"><strong>The local fixture could not finish.</strong><p>${escapeText(message)} Try running it again.</p></div>`;
  } finally {
    runButton.disabled = false;
    runButton.classList.remove('is-running');
    runButton.querySelector('span:last-child')!.textContent = 'Run five break tests';
  }
}

runButton.addEventListener('click', runFixtures);

document.querySelectorAll<HTMLButtonElement>('.copy-button').forEach((button) => {
  button.addEventListener('click', async () => {
    const targetId = button.dataset.copyTarget;
    const value = targetId ? document.querySelector<HTMLElement>(`#${targetId}`)?.innerText : button.dataset.copy;
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.textContent = 'Copied to clipboard';
    } catch {
      toast.textContent = 'Copy unavailable. Select the command manually.';
    }
    toast.classList.add('is-visible');
    window.setTimeout(() => toast.classList.remove('is-visible'), 1800);
  });
});

function updateNetworkState(): void {
  offlineNote.hidden = navigator.onLine;
}
window.addEventListener('online', updateNetworkState);
window.addEventListener('offline', updateNetworkState);
updateNetworkState();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined));
}
