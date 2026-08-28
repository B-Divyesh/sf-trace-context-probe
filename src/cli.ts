import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { formatDot, renderHtml } from './reporters.js';
import type { ProbeReport } from './types.js';

const HELP = `Trace Context Probe 0.1.0

Find the first async boundary where trace context is lost.

Usage:
  trace-context-probe report <report.json> [options]
  trace-context-probe --help

Options:
  -o, --output <path>  Write a standalone HTML graph (default: trace-context-report.html)
  --json               Print the validated report JSON to stdout; write no HTML
  --dot                Print Graphviz DOT to stdout; write no HTML
  --fail-on-loss       Exit 2 when any broken or unobserved boundary is present
  -h, --help           Show this help

Exit codes:
  0  Report processed (or healthy with --fail-on-loss)
  1  Invalid arguments, unreadable file, or malformed report
  2  Context loss found with --fail-on-loss

The command is non-interactive and performs no network requests.`;

function isReport(value: unknown): value is ProbeReport {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ProbeReport>;
  return candidate.schemaVersion === 1
    && typeof candidate.session === 'string'
    && typeof candidate.generatedAt === 'string'
    && typeof candidate.ok === 'boolean'
    && Array.isArray(candidate.boundaries)
    && candidate.boundaries.every((boundary) =>
      boundary && typeof boundary.id === 'string' && typeof boundary.name === 'string'
      && typeof boundary.status === 'string' && typeof boundary.elapsedMs === 'number')
    && !!candidate.summary && typeof candidate.summary.total === 'number';
}

interface ParsedArgs {
  input: string;
  output: string;
  json: boolean;
  dot: boolean;
  failOnLoss: boolean;
}

function parseArgs(argv: string[]): ParsedArgs | 'help' {
  if (argv.length === 0 || argv.includes('-h') || argv.includes('--help')) return 'help';
  if (argv[0] !== 'report' || !argv[1] || argv[1].startsWith('-')) {
    throw new Error('Expected: report <report.json>. Run with --help for usage.');
  }
  let output = 'trace-context-report.html';
  let json = false;
  let dot = false;
  let failOnLoss = false;
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') json = true;
    else if (arg === '--dot') dot = true;
    else if (arg === '--fail-on-loss') failOnLoss = true;
    else if (arg === '-o' || arg === '--output') {
      const value = argv[++index];
      if (!value || value.startsWith('-')) throw new Error(`${arg} requires a file path.`);
      output = value;
    } else throw new Error(`Unknown option: ${arg}`);
  }
  if (json && dot) throw new Error('Choose either --json or --dot, not both.');
  return { input: argv[1], output, json, dot, failOnLoss };
}

export async function runCli(argv: string[]): Promise<number> {
  try {
    const args = parseArgs(argv);
    if (args === 'help') {
      process.stdout.write(`${HELP}\n`);
      return 0;
    }
    const raw = await readFile(args.input, 'utf8');
    const value: unknown = JSON.parse(raw);
    if (!isReport(value)) throw new Error('Input is not a Trace Context Probe schema-v1 report.');
    if (args.json) process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
    else if (args.dot) process.stdout.write(`${formatDot(value)}\n`);
    else {
      await writeFile(args.output, renderHtml(value), 'utf8');
      process.stdout.write(`Wrote ${args.output} · ${value.ok ? 'context preserved' : `first break: ${value.firstBrokenBoundary?.name ?? 'unknown'}`}\n`);
    }
    return args.failOnLoss && !value.ok ? 2 : 0;
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Unknown error';
    process.stderr.write(`trace-context-probe: ${message}\n`);
    return 1;
  }
}

void runCli(process.argv.slice(2)).then((code) => {
  process.exitCode = code;
});
