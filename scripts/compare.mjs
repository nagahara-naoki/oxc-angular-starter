import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCompilerHost, formatDiagnostics, performCompilation, readConfiguration } from '@angular/compiler-cli';
import { transformAngularFileSync } from '@oxc-angular/vite/api';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const generated = resolve(root, 'src/generated');
const artifacts = resolve(root, '.compiler-output');
const cases = [
  { file: 'counter.ts', title: 'シグナルカウンター' },
  { file: 'missing-phase.ts', title: 'フェーズを省略したイベント' },
];
const versionOf = async name =>
  JSON.parse(await readFile(resolve(root, 'node_modules', name, 'package.json'), 'utf8')).version;
const angularVersion = await versionOf('@angular/core');
const oxcVersion = await versionOf('@oxc-angular/vite');
const [major, minor, patch] = angularVersion.split('.').map(Number);
const config = readConfiguration(resolve(root, 'tsconfig.json'));
if (config.errors.length) throw new Error(formatDiagnostics(config.errors));

function compileAngular(file) {
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

// Use the same printer for both compilers so indentation alone does not look like a difference.
function templateFunction(code) {
  const ast = ts.createSourceFile('output.ts', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let template;
  function visit(node) {
    if (ts.isPropertyAssignment(node) && node.name.getText(ast) === 'template' &&
        ts.isFunctionExpression(node.initializer)) {
      template = node.initializer;
    } else {
      ts.forEachChild(node, visit);
    }
  }
  visit(ast);
  if (!template) throw new Error('Successful compilation produced no template function.');
  return ts.createPrinter().printNode(ts.EmitHint.Expression, template, ast);
}


function inlineTemplate(source, path) {
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
  let value;
  function visit(node) {
    if (ts.isPropertyAssignment(node) && node.name.getText(ast) === 'template' &&
        ts.isStringLiteralLike(node.initializer)) {
      value = node.initializer.text;
    } else {
      ts.forEachChild(node, visit);
    }
  }
  visit(ast);
  if (value === undefined) throw new Error('Expected an inline template in ' + path);
  return value;
}

async function save(file, contents) {
  const temporary = file + '.' + process.pid + '.tmp';
  await writeFile(temporary, contents);
  await rename(temporary, file);
}

await Promise.all([mkdir(generated, { recursive: true }), mkdir(artifacts, { recursive: true })]);
const results = [];
for (const { file, title } of cases) {
  const path = resolve(root, 'fixtures', file);
  const source = await readFile(path, 'utf8');
  const angular = compileAngular(path);
  const oxc = transformAngularFileSync(source, path, { angularVersion: { major, minor, patch } },
    { templates: {}, styles: {} });
  const panels = [];
  for (const [id, name, version, code, errors] of [
    ['ngc', 'Angular', angularVersion, angular.code, angular.errors],
    ['oxc', 'Oxc', oxcVersion, oxc.code, oxc.errors.map(e => e.message)],
  ]) {
    const ok = errors.length === 0;
    const diagnostic = errors.join('\n').replace(/\x1b\[[0-9;]*m/g, '').replaceAll(root, '').trim();
    await save(resolve(artifacts, basename(file, '.ts') + '.' + id + '.txt'), ok ? code : diagnostic);
    panels.push({ id, name, version, ok, output: ok ? templateFunction(code) : diagnostic });
    console.log(file, name, version, ok ? 'OK' : diagnostic.split('\n')[0]);
  }
  results.push({ title, file, source, template: inlineTemplate(source, path), panels });
}
await save(resolve(generated, 'comparison.json'), JSON.stringify(results, null, 2) + '\n');
