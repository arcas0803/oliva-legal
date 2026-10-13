#!/usr/bin/env node
import { readFile, writeFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { evaluateReport } from './evaluate-report.mjs';
const args = {};
for (const arg of process.argv.slice(2)) {
  const i = arg.indexOf('=');
  if (i < 0 || !arg.startsWith('--')) throw new Error('Use --name=value');
  args[arg.slice(2, i)] = arg.slice(i + 1);
}
if (!args.report) throw new Error('Required: --report=summary.json');
if (args.scope && !['demo', 'launch'].includes(args.scope))
  throw new Error('Scope: demo or launch');
const report = JSON.parse(await readFile(args.report, 'utf8'));
const evidence = args.evidence
  ? JSON.parse(await readFile(args.evidence, 'utf8'))
  : {};
if (args.evidence) {
  for (const item of Object.values(evidence)) {
    for (const path of item.artifacts ?? []) {
      try {
        await access(resolve(dirname(args.evidence), path));
      } catch {
        item.status = 'failed';
        item.note = 'Artifact missing: ' + path;
      }
    }
  }
}
const result = evaluateReport(report, {
  scope: args.scope,
  profiles: args.profiles?.split(','),
  evidence,
});
if (args.output) await writeFile(args.output, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.failed ? 1 : result.requiredPending ? 2 : 0;
