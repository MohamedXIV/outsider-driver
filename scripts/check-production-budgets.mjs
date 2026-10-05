import { readFile, readdir } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST_ROOT = resolve('dist');
const CONFIG_PATH = resolve('config/performance-budgets.json');
const INOCHI_WASM_PATH = 'vendor/inochi2d/inochi2d.wasm';

function normalizePath(path) {
  return path.split(sep).join('/');
}

function formatBytes(bytes) {
  return `${bytes.toLocaleString('en-US')} B`;
}

function requireBudget(budgets, name) {
  const value = budgets[name];

  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(
      `Performance budget ${name} must be a positive integer number of bytes/milliseconds.`,
    );
  }

  return value;
}

async function listFiles(directory) {
  const entries = await readdir(directory, {
    withFileTypes: true,
  });
  const files = [];

  for (const entry of entries) {
    const path = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await listFiles(path));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }

  return files;
}

function attribute(tag, name) {
  const match = tag.match(
    new RegExp(
      `\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`,
      'i',
    ),
  );

  return match?.[1] ?? match?.[2] ?? null;
}

function resolveDistReference(reference) {
  const withoutQuery = reference.split(/[?#]/, 1)[0] ?? '';
  const decoded = decodeURIComponent(
    withoutQuery.replace(/^\.\//, '').replace(/^\//, ''),
  );

  if (
    decoded.length === 0 ||
    decoded.startsWith('../') ||
    decoded.includes('/../')
  ) {
    throw new Error(
      `Invalid production asset reference: ${reference}`,
    );
  }

  return normalizePath(decoded);
}

function findInitialReferences(indexHtml) {
  const moduleScripts = [];
  const linkedAssets = [];

  for (const tag of indexHtml.match(/<script\b[^>]*>/gi) ?? []) {
    if (attribute(tag, 'type') !== 'module') {
      continue;
    }

    const source = attribute(tag, 'src');

    if (source !== null) {
      moduleScripts.push(resolveDistReference(source));
    }
  }

  for (const tag of indexHtml.match(/<link\b[^>]*>/gi) ?? []) {
    const relation = attribute(tag, 'rel')?.toLowerCase();

    if (
      relation !== 'stylesheet' &&
      relation !== 'modulepreload' &&
      relation !== 'preload'
    ) {
      continue;
    }

    const href = attribute(tag, 'href');

    if (href !== null) {
      linkedAssets.push(resolveDistReference(href));
    }
  }

  if (moduleScripts.length !== 1) {
    throw new Error(
      `Expected exactly one production module entry in dist/index.html, found ${String(moduleScripts.length)}.`,
    );
  }

  return {
    entryJavaScript: moduleScripts[0],
    initialAssets: [
      ...new Set([...moduleScripts, ...linkedAssets]),
    ],
  };
}

function gzipBytes(bytes) {
  return gzipSync(bytes, { level: 9 }).byteLength;
}

async function measureProductionBuild() {
  const [configText, indexBytes, files] = await Promise.all([
    readFile(CONFIG_PATH, 'utf8'),
    readFile(resolve(DIST_ROOT, 'index.html')),
    listFiles(DIST_ROOT),
  ]);
  const config = JSON.parse(configText);
  const budgets = config.budgets;

  if (
    config.schemaVersion !== 1 ||
    typeof budgets !== 'object' ||
    budgets === null
  ) {
    throw new Error(
      'config/performance-budgets.json has an unsupported schema.',
    );
  }

  const relativeFiles = files.map((path) =>
    normalizePath(relative(DIST_ROOT, path)),
  );
  const fixtureFiles = relativeFiles.filter(
    (path) =>
      path.startsWith('__fixtures__/') ||
      path.includes('/__fixtures__/'),
  );

  if (fixtureFiles.length > 0) {
    throw new Error(
      `Production output contains CI/test fixtures: ${fixtureFiles.join(', ')}`,
    );
  }

  const indexHtml = indexBytes.toString('utf8');
  const { entryJavaScript, initialAssets } =
    findInitialReferences(indexHtml);
  const entryPath = resolve(DIST_ROOT, entryJavaScript);
  const entryBytes = await readFile(entryPath);
  const jsFiles = relativeFiles.filter(
    (path) => path.endsWith('.js'),
  );

  if (!jsFiles.includes(entryJavaScript)) {
    throw new Error(
      `Production module entry ${entryJavaScript} is missing from dist.`,
    );
  }

  const jsMeasurements = await Promise.all(
    jsFiles.map(async (path) => {
      const bytes = await readFile(resolve(DIST_ROOT, path));
      return {
        path,
        bytes: bytes.byteLength,
        gzipBytes: gzipBytes(bytes),
      };
    }),
  );
  const lazyMeasurements = jsMeasurements.filter(
    ({ path }) => path !== entryJavaScript,
  );
  const largestLazy = lazyMeasurements.reduce(
    (largest, current) =>
      current.bytes > largest.bytes ? current : largest,
    { path: '(none)', bytes: 0, gzipBytes: 0 },
  );
  const initialAssetMeasurements = await Promise.all(
    initialAssets.map(async (path) => {
      const bytes = await readFile(resolve(DIST_ROOT, path));
      return {
        path,
        bytes: bytes.byteLength,
        gzipBytes: gzipBytes(bytes),
      };
    }),
  );
  const wasmBytes = await readFile(
    resolve(DIST_ROOT, INOCHI_WASM_PATH),
  );

  return {
    budgets,
    measurements: {
      entryJavaScriptBytes: entryBytes.byteLength,
      entryJavaScriptGzipBytes: gzipBytes(entryBytes),
      totalJavaScriptBytes: jsMeasurements.reduce(
        (sum, item) => sum + item.bytes,
        0,
      ),
      totalJavaScriptGzipBytes: jsMeasurements.reduce(
        (sum, item) => sum + item.gzipBytes,
        0,
      ),
      maxLazyJavaScriptBytes: largestLazy.bytes,
      initialTransferGzipBytes:
        gzipBytes(indexBytes) +
        initialAssetMeasurements.reduce(
          (sum, item) => sum + item.gzipBytes,
          0,
        ),
      inochiWasmBytes: wasmBytes.byteLength,
    },
    details: {
      entryJavaScript,
      largestLazyJavaScript: largestLazy.path,
      initialAssets,
      javascriptFileCount: jsMeasurements.length,
    },
  };
}

const report = await measureProductionBuild();
const checks = [
  [
    'entryJavaScriptBytes',
    'Entry JavaScript',
    'bytes',
  ],
  [
    'entryJavaScriptGzipBytes',
    'Entry JavaScript (gzip)',
    'bytes',
  ],
  [
    'totalJavaScriptBytes',
    'Total JavaScript',
    'bytes',
  ],
  [
    'totalJavaScriptGzipBytes',
    'Total JavaScript (gzip)',
    'bytes',
  ],
  [
    'maxLazyJavaScriptBytes',
    'Largest lazy JavaScript chunk',
    'bytes',
  ],
  [
    'initialTransferGzipBytes',
    'Initial HTML/CSS/module transfer (gzip)',
    'bytes',
  ],
  [
    'inochiWasmBytes',
    'Inochi2D WASM',
    'bytes',
  ],
];

const failures = [];
const startupReadyBudget = requireBudget(
  report.budgets,
  'startupReadyMs',
);

process.stdout.write(
  [
    'Production budget report',
    `Entry: ${report.details.entryJavaScript}`,
    `Largest lazy chunk: ${report.details.largestLazyJavaScript}`,
    `JavaScript chunks: ${String(report.details.javascriptFileCount)}`,
    `Initial assets: ${report.details.initialAssets.join(', ')}`,
    '',
  ].join('\n'),
);

for (const [key, label] of checks) {
  const current = report.measurements[key];
  const budget = requireBudget(report.budgets, key);
  const passed = current <= budget;

  process.stdout.write(
    `${passed ? 'PASS' : 'FAIL'} ${label}: ${formatBytes(current)} / ${formatBytes(budget)}\n`,
  );

  if (!passed) {
    failures.push(
      `${label} exceeded its budget by ${formatBytes(current - budget)}.`,
    );
  }
}

process.stdout.write(
  [
    'PASS Production fixture isolation: no dist/__fixtures__ content.',
    `INFO Startup-ready browser budget: ${String(startupReadyBudget)} ms.`,
    '',
  ].join('\n'),
);

if (failures.length > 0) {
  process.stderr.write(
    `\nProduction budget failures:\n- ${failures.join('\n- ')}\n`,
  );
  process.exitCode = 1;
}
