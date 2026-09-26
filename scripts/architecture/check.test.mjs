import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspect, imports } from './check.mjs';

test('blocks new cross-feature UI coupling through aliases and relative paths', () => {
  const r = inspect({'src/components/payroll/Panel.tsx': `import A from '@/components/employees/A'; export { B } from '../holidays/B';`});
  assert.equal(r.issues.length, 2);
});
test('allows UI primitives and pure shared rules', () => {
  assert.deepEqual(inspect({'src/components/payroll/Panel.tsx': `import A from '@/components/ui/button'; import B from '@/lib/rules';`}).issues, []);
});
test('blocks hooks and libraries importing views, including dynamic and type imports', () => {
  const r = inspect({'src/hooks/useThing.ts': `const x = import('../pages/Employees'); type T = import('@/components/staff/Panel').T;`});
  assert.equal(r.issues.length, 2);
});
test('existing exceptions do not permit a new destination', () => {
  const before = {'src/lib/rule.ts': `import A from '@/pages/Payroll';`};
  const baseline = inspect(before);
  assert.deepEqual(inspect(before, baseline).issues, []);
  assert.equal(inspect({'src/lib/rule.ts': `import A from '@/pages/Employees';`}, baseline).issues.length, 1);
});
test('new large files fail; tracked files may shrink but cannot grow past their ceiling', () => {
  const file = 'src/pages/Payroll.tsx';
  const source = Array(600).fill('const x = 1;').join('\n');
  assert.equal(inspect({[file]: source}).issues.length, 1);
  const baseline = inspect({[file]: source});
  assert.equal(inspect({[file]: source}, baseline).issues.length, 0);
  assert.equal(inspect({[file]: source + '\nconst y = 2;'}, baseline).issues.length, 1);
  assert.equal(inspect({[file]: 'export {}'}, baseline).issues.length, 0);
});
test('excludes tests, generated integration types and authored course data from size budgets', () => {
  const source = 'export {};\n'.repeat(600);
  assert.equal(inspect({'src/test/foo.test.ts': source, 'src/integrations/supabase/types.ts': source, 'src/data/course.ts': source}).issues.length, 0);
});
test('AST ignores comments and prose containing fake imports', () => {
  assert.deepEqual(imports('src/lib/a.ts', `// import X from '@/pages/X'\nconst text = "import Y from '@/pages/Y'";`), []);
});
test('blocks page-to-page coupling and CommonJS bypass', () => {
  assert.equal(inspect({'src/pages/Payroll.tsx': `const x = require('./Employees');`}).issues.length, 1);
});
