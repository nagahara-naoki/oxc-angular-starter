import { cp, mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { cpus } from 'node:os';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { angularVersion, compileAngular, compileOxc, oxcVersion, root, versionOf } from './compilers.mjs';

const file = resolve(root, 'fixtures/counter.ts');
const source = await readFile(file, 'utf8');
const scratch = resolve(root, '.compiler-output');
await mkdir(scratch, { recursive: true });

// Each invocation builds the same source tree with empty project caches and output directories.
async function timeBuild(engine) {
  const cwd = await mkdtemp(resolve(scratch, 'timing-'));
  try {
    for (const entry of ['angular.json', 'vite.config.ts', 'tsconfig.json', 'package.json',
      'src', 'fixtures', 'index.html', 'public']) {
      await cp(resolve(root, entry), resolve(cwd, entry), { recursive: true });
    }
    await symlink(resolve(root, 'node_modules'), resolve(cwd, 'node_modules'), 'junction');
    const cli = engine === 'angular' ? '@angular/cli/bin/ng.js' : 'vite/bin/vite.js';
    const start = performance.now();
    const result = spawnSync(process.execPath, [resolve(root, 'node_modules', cli), 'build'], {
      cwd, encoding: 'utf8', env: { ...process.env, NG_CLI_ANALYTICS: 'false' },
    });
    const elapsed = performance.now() - start;
    if (result.error || result.status !== 0) {
      throw new Error(result.error?.message ?? (result.stdout + result.stderr));
    }
    return elapsed;
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
}

function timeComponent(engine) {
  const start = performance.now();
  const result = engine === 'angular' ? compileAngular(file) : compileOxc(file, source);
  const elapsed = performance.now() - start;
  if (result.errors.length || !result.code.includes('ɵɵdefineComponent')) {
    throw new Error(engine + ' failed to compile counter.ts: ' + result.errors.join('\n'));
  }
  return elapsed;
}

async function measure(run) {
  const samples = { angular: [], oxc: [] };
  // Discard a warm-up pair; alternate which compiler goes first in each recorded pair.
  for (let i = -1; i < 6; i++) {
    const order = i % 2 === 0 ? ['angular', 'oxc'] : ['oxc', 'angular'];
    for (const engine of order) {
      const ms = await run(engine);
      if (i >= 0) samples[engine].push(ms);
    }
  }
  return samples;
}

const component = await measure(timeComponent);
const build = await measure(timeBuild);
const report = {
  measuredAt: new Date().toISOString(),
  environment: {
    platform: process.platform, arch: process.arch, cpu: cpus()[0]?.model ?? 'unknown',
    node: process.version, angular: angularVersion, oxc: oxcVersion, vite: await versionOf('vite'),
    runner: process.env.GITHUB_ACTIONS === 'true' ? 'GitHub Actions' : 'ローカル',
  },
  build, component,
};
const dir = resolve(root, 'public');
await mkdir(dir, { recursive: true });
const temp = resolve(dir, 'benchmark-' + process.pid + '.tmp');
await writeFile(temp, JSON.stringify(report, null, 2) + '\n');
await rename(temp, resolve(dir, 'benchmark.json'));
console.log('Saved 6 paired samples per metric to public/benchmark.json');
