import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCompilerHost, formatDiagnostics, performCompilation, readConfiguration } from '@angular/compiler-cli';
import { transformAngularFileSync } from '@oxc-angular/vite/api';
import ts from 'typescript';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const versionOf = async name =>
  JSON.parse(await readFile(resolve(root, 'node_modules', name, 'package.json'), 'utf8')).version;
export const angularVersion = await versionOf('@angular/core');
export const oxcVersion = await versionOf('@oxc-angular/vite');
const [major, minor, patch] = angularVersion.split('.').map(Number);
const config = readConfiguration(resolve(root, 'tsconfig.json'));
if (config.errors.length) throw new Error(formatDiagnostics(config.errors));

export function compileAngular(file) {
  const options = { ...config.options, rootDir: resolve(root, 'fixtures'), noEmitOnError: true };
  const host = createCompilerHost({ options });
  let code = '';
  host.writeFile = (name, contents) => {
    if (name.endsWith('.js')) code = contents;
  };
  const { diagnostics } = performCompilation({ rootNames: [file], options, host });
  const errors = diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error);
  return { code, errors: errors.map(d => formatDiagnostics([d])) };
}

export function compileOxc(file, source) {
  const result = transformAngularFileSync(source, file, { angularVersion: { major, minor, patch } },
    { templates: {}, styles: {} });
  return { code: result.code, errors: result.errors.map(error => error.message) };
}
