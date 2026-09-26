import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const sharedComponents = new Set(['ui', 'layout', 'auth', 'common']);
export const limit = 500;
export function isProduction(file) {
  return /^src\/.+\.[cm]?[jt]sx?$/.test(file)
    && !/(^|\/)(test|tests|__tests__|data|integrations)(\/|$)/.test(file)
    && !/\.(test|spec|d)\.[cm]?[jt]sx?$/.test(file);
}
export function imports(file, source) {
  const found = [];
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier
        && ts.isStringLiteral(node.moduleSpecifier)) found.push(node.moduleSpecifier.text);
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword
        || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
        && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) found.push(node.arguments[0].text);
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)
        && ts.isStringLiteral(node.argument.literal)) found.push(node.argument.literal.text);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return [...new Set(found)];
}
export function targetPath(file, specifier) {
  if (specifier.startsWith('@/')) return `src/${specifier.slice(2)}`;
  if (specifier.startsWith('.')) return path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier));
  return null;
}
export function boundaryReason(from, to) {
  if (/^src\/(lib|hooks)\//.test(from) && /^src\/(components|pages)\//.test(to))
    return 'logic-to-view';
  if (/^src\/pages\//.test(from) && /^src\/pages\//.test(to)) return 'page-to-page';
  const a = from.match(/^src\/components\/([^/]+)\//)?.[1];
  const b = to.match(/^src\/components\/([^/]+)\//)?.[1];
  if (a && b && a !== b && !sharedComponents.has(b)) return 'cross-feature-view';
  return null;
}
export function inspect(files, baseline = { largeFiles: {}, edges: [] }) {
  const allowed = new Set(baseline.edges);
  const issues = [], largeFiles = {}, edges = [];
  for (const [file, source] of Object.entries(files)) {
    if (!isProduction(file)) continue;
    const lines = source.trimEnd().split('\n').length;
    if (lines > limit) largeFiles[file] = lines;
    const ceiling = Math.max(limit, baseline.largeFiles[file] ?? limit);
    if (lines > ceiling) issues.push(`${file}: ${lines} lines exceeds ${ceiling}; extract a focused module.`);
    for (const specifier of imports(file, source)) {
      const target = targetPath(file, specifier);
      const reason = target && boundaryReason(file, target);
      if (!reason) continue;
      const edge = `${file} -> ${target} [${reason}]`;
      edges.push(edge);
      if (!allowed.has(edge)) issues.push(`${edge}: new coupling; use a shared domain contract or request explicit boundary review.`);
    }
  }
  return { issues, largeFiles, edges: [...new Set(edges)].sort() };
}
function readSources(dir, root, out = {}) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) readSources(full, root, out);
    else if (/\.[cm]?[jt]sx?$/.test(entry.name)) out[path.relative(root, full).split(path.sep).join('/')] = fs.readFileSync(full, 'utf8');
  }
  return out;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const baseline = JSON.parse(fs.readFileSync(path.join(root, 'scripts/architecture/baseline.json'), 'utf8'));
  const result = inspect(readSources(path.join(root, 'src'), root), baseline);
  if (result.issues.length) {
    console.error(result.issues.join('\n'));
    process.exitCode = 1;
  } else console.log(`Architecture checks passed. ${Object.keys(result.largeFiles).length} existing large files and ${result.edges.length} existing boundary edges remain tracked.`);
}
