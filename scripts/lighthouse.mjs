#!/usr/bin/env node
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';

const opts = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const i = a.indexOf('=');
    return i < 0
      ? [a.replace(/^--/, ''), 'true']
      : [a.slice(0, i).replace(/^--/, ''), a.slice(i + 1)];
  }),
);
const url = opts.url ?? 'http://127.0.0.1:4322/';
if (!/^https?:\/\//.test(url))
  throw new Error('Supply --url=http://… or https://…');
const runs = Number(opts.runs ?? 3);
if (!Number.isInteger(runs) || runs < 1 || runs > 9)
  throw new Error('--runs must be between 1 and 9');
const profiles = (opts.profiles ?? 'mobile,desktop').split(',');
if (profiles.some((p) => !['mobile', 'desktop'].includes(p)))
  throw new Error('Profiles: mobile,desktop');
const out = resolve(opts.output ?? 'audits');
const require = createRequire(join(process.cwd(), 'package.json'));
const lh = (await import(require.resolve('lighthouse'))).default;
const launcher = await import(require.resolve('chrome-launcher'));
const desktopConfig = (
  await import(require.resolve('lighthouse/core/config/desktop-config.js'))
).default;
const { gzipSync } = await import('node:zlib');
const { readFile } = await import('node:fs/promises');
await mkdir(out, { recursive: true });
const chrome = await launcher.launch({
  chromeFlags: ['--headless'],
  ...(opts.chrome ? { chromePath: opts.chrome } : {}),
});
const summary = {
  url,
  createdAt: new Date().toISOString(),
  expectedNoindex: opts['expected-noindex'] === 'true',
  profiles: {},
};
const median = (values) => {
  const v = [...values].sort((a, b) => a - b);
  return v.length % 2
    ? v[(v.length - 1) / 2]
    : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
};
try {
  for (const profile of profiles) {
    const reports = [];
    for (let i = 1; i <= runs; i++) {
      const flags = {
        port: chrome.port,
        logLevel: 'error',
        output: 'json',
        onlyCategories: [
          'performance',
          'accessibility',
          'best-practices',
          'seo',
        ],
        ...(profile === 'desktop' ? { preset: 'desktop' } : {}),
      };
      const { lhr } = await lh(
        url,
        flags,
        profile === 'desktop' ? desktopConfig : undefined,
      );
      if (lhr.configSettings.formFactor !== profile)
        throw new Error(
          'Reported form factor does not match requested profile.',
        );
      if (lhr.runtimeError) throw new Error(lhr.runtimeError.message);
      await writeFile(
        join(out, profile + '-' + i + '.json'),
        JSON.stringify(lhr, null, 2),
      );
      reports.push(lhr);
      console.log(profile + ' ' + i + '/' + runs + ' saved');
    }
    const first = reports[0];
    const metrics = {};
    for (const key of [
      'first-contentful-paint',
      'largest-contentful-paint',
      'cumulative-layout-shift',
      'total-blocking-time',
      'speed-index',
    ]) {
      const values = reports
        .map((r) => r.audits[key]?.numericValue)
        .filter((v) => typeof v === 'number');
      metrics[key] = values.length
        ? {
            median: median(values),
            min: Math.min(...values),
            max: Math.max(...values),
          }
        : null;
    }
    const scores = {};
    for (const key of [
      'performance',
      'accessibility',
      'best-practices',
      'seo',
    ]) {
      const values = reports
        .map((r) => r.categories[key]?.score)
        .filter((v) => typeof v === 'number')
        .map((v) => v * 100);
      scores[key] = values.length
        ? {
            median: median(values),
            min: Math.min(...values),
            max: Math.max(...values),
          }
        : null;
    }
    summary.profiles[profile] = {
      routeResources: reports.map((report) => {
        const items = report.audits['network-requests']?.details?.items ?? [];
        const origin = new URL(url).origin;
        const groups = {};
        for (const item of items) {
          const group =
            new URL(item.url).origin === origin
              ? (item.resourceType ?? 'Other')
              : 'ThirdParty';
          groups[group] ??= { requests: 0, transferBytes: 0, decodedBytes: 0 };
          groups[group].requests++;
          groups[group].transferBytes += item.transferSize ?? 0;
          groups[group].decodedBytes += item.resourceSize ?? 0;
        }
        return {
          scope:
            'Resources observed during this navigation; transfer includes headers, inline JS belongs to Document, cached zero bytes are not absence.',
          groups,
        };
      }),
      runCount: reports.length,
      lighthouseVersion: first.lighthouseVersion,
      userAgent: first.environment?.hostUserAgent,
      settings: first.configSettings,
      metrics,
      scores,
      failures: reports.flatMap((r, index) =>
        Object.entries(r.audits)
          .filter(
            ([, a]) =>
              a.score !== null &&
              a.score < 1 &&
              ['binary', 'numeric'].includes(a.scoreDisplayMode),
          )
          .map(([id, a]) => ({
            run: index + 1,
            id,
            title: a.title,
            score: a.score,
            mode: a.scoreDisplayMode,
            expected: summary.expectedNoindex && id === 'is-crawlable',
          })),
      ),
    };
  }
  const dist = resolve(opts.dist ?? 'dist');
  const { readdir } = await import('node:fs/promises');
  async function walk(dir) {
    let files = [];
    for (const item of await readdir(dir, { withFileTypes: true })) {
      const p = join(dir, item.name);
      if (item.isDirectory()) files.push(...(await walk(p)));
      else files.push(p);
    }
    return files;
  }
  try {
    const files = await walk(dist);
    summary.buildResources = { jsGzipBytes: 0, cssGzipBytes: 0 };
    for (const f of files) {
      if (f.endsWith('.js'))
        summary.buildResources.jsGzipBytes += gzipSync(
          await readFile(f),
        ).length;
      else if (f.endsWith('.css'))
        summary.buildResources.cssGzipBytes += gzipSync(
          await readFile(f),
        ).length;
    }
    for (const f of files.filter((f) => f.endsWith('.html'))) {
      const html = await readFile(f, 'utf8');
      for (const match of html.matchAll(
        /<script\b([^>]*)>([\s\S]*?)<\/script>/gi,
      )) {
        if (
          !/\bsrc\s*=/.test(match[1]) &&
          !/application\/(ld\+json|json)/.test(match[1]) &&
          match[2].trim()
        )
          summary.buildResources.jsGzipBytes += gzipSync(match[2]).length;
      }
      for (const match of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi))
        summary.buildResources.cssGzipBytes += gzipSync(match[1]).length;
    }
    summary.buildResources.scope =
      'Conservative sum of all built JS/CSS files and executable inline scripts/styles, gzip per block. Not initial network transfer; third parties excluded.';
  } catch {
    summary.buildResources = null;
  }
  summary.field = {
    LCP: 'unavailable',
    INP: 'unavailable',
    CLS: 'unavailable',
    note: 'Synthetic audit. Field p75 and actual conversion/retention require real user data.',
  };
  await writeFile(join(out, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(
    JSON.stringify(
      {
        summary: join(out, 'summary.json'),
        profiles: Object.fromEntries(
          Object.entries(summary.profiles).map(([k, v]) => [
            k,
            { metrics: v.metrics, scores: v.scores },
          ]),
        ),
      },
      null,
      2,
    ),
  );
} finally {
  await chrome.kill();
}
