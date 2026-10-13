export function evaluateReport(report, options = {}) {
  const scope = options.scope ?? 'demo',
    profiles = options.profiles ?? ['mobile', 'desktop'],
    evidence = options.evidence ?? {};
  const gates = [];
  const add = (id, status, required, detail) =>
    gates.push({ id, status, required, detail });
  const finite = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
  if (
    !report ||
    typeof report !== 'object' ||
    !report.profiles ||
    !Object.keys(report.profiles).length
  )
    add('report', 'failed', true, 'Missing measured profiles.');
  for (const profile of profiles) {
    const data = report?.profiles?.[profile];
    if (!data) {
      add(
        profile + ': measurement',
        'pending',
        true,
        'Required profile missing.',
      );
      continue;
    }
    add(
      profile + ': conditions',
      data.settings?.formFactor === profile ? 'passed' : 'failed',
      true,
      'Reported form factor must match profile.',
    );
    add(
      profile + ': repetitions',
      data.runCount >= 3 ? 'passed' : 'pending',
      true,
      'At least 3 equivalent runs required.',
    );
    for (const [id, limit] of [
      ['largest-contentful-paint', 2500],
      ['cumulative-layout-shift', 0.1],
      ['total-blocking-time', 200],
    ]) {
      const value = data.metrics?.[id]?.median;
      add(
        profile + ': ' + id,
        !finite(value) ? 'pending' : value <= limit ? 'passed' : 'failed',
        true,
        { value, limit, scope: 'lab' },
      );
    }
    for (const category of [
      'performance',
      'accessibility',
      'best-practices',
      'seo',
    ]) {
      const value = data.scores?.[category]?.median;
      add(
        profile + ': ' + category + ' score',
        !finite(value) || value > 100
          ? 'pending'
          : category === 'performance' && value < 95
            ? 'failed'
            : 'passed',
        true,
        {
          value,
          note: 'Score completeness; issue-level results determine accessibility/SEO acceptance.',
        },
      );
    }
    if (!Array.isArray(data.failures)) {
      add(
        profile + ': issue evidence',
        'pending',
        true,
        'Missing audit issue list.',
      );
      continue;
    }
    const failures = data.failures.filter(
      (f) =>
        f.score === 0 &&
        f.mode === 'binary' &&
        !(
          scope === 'demo' &&
          report.expectedNoindex &&
          f.id === 'is-crawlable'
        ),
    );
    add(
      profile + ': audit failures',
      failures.length ? 'failed' : 'passed',
      true,
      failures,
    );
    if (report.expectedNoindex)
      add(
        profile + ': indexation',
        scope === 'demo' ? 'not_applicable' : 'failed',
        true,
        'noindex intentionally excluded only for demos.',
      );
    add(
      profile + ': opportunities',
      data.failures.some((f) => f.mode === 'numeric')
        ? 'pending'
        : 'not_applicable',
      false,
      data.failures.filter((f) => f.mode === 'numeric'),
    );
  }
  for (const [key, limit] of [
    ['jsGzipBytes', 30720],
    ['cssGzipBytes', 51200],
  ]) {
    const value = report?.buildResources?.[key];
    add(
      key,
      !finite(value) ? 'pending' : value <= limit ? 'passed' : 'failed',
      true,
      { value, limit, scope: 'Conservative build proxy, not route transfer.' },
    );
  }
  for (const id of [
    'visual',
    'keyboard',
    'reflow',
    'reducedMotion',
    'journeys',
    'seo',
  ]) {
    const item = evidence[id];
    const valid =
      item &&
      item.status === 'passed' &&
      typeof item.note === 'string' &&
      item.note.trim() &&
      Array.isArray(item.artifacts) &&
      item.artifacts.length > 0;
    add(
      id,
      valid ? 'passed' : item?.status === 'failed' ? 'failed' : 'pending',
      true,
      item ?? 'Review and artifact evidence required.',
    );
  }
  add(
    'field Core Web Vitals',
    'pending',
    false,
    'Requires real-user p75 data; new demo/launch cannot prove it.',
  );
  add(
    'conversion and retention',
    'pending',
    false,
    'Requires real leads and closed-window cohorts.',
  );
  const failed = gates.filter((g) => g.status === 'failed').length;
  const requiredPending = gates.filter(
    (g) => g.required && g.status === 'pending',
  ).length;
  return {
    scope,
    gates,
    failed,
    requiredPending,
    noDetectedFailures: failed === 0,
    ready: failed === 0 && requiredPending === 0,
  };
}
