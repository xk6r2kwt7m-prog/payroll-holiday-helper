import tseslint from 'typescript-eslint';

// Calculation modules may depend on other pure rules, never on UI/database code.
export default [{
  files: ['src/lib/financial-rules/**/*.ts', 'src/lib/holiday-year-summary.ts', 'src/lib/payroll-status.ts'],
  languageOptions: { parser: tseslint.parser, ecmaVersion: 'latest', sourceType: 'module' },
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{group: ['react', 'react/*', '@tanstack/*', '@supabase/*', '@/hooks/*', '@/components/*', '@/pages/*', '@/integrations/*', '**/hooks/**', '**/components/**', '**/pages/**', '**/integrations/**'], message: 'Financial rules must be pure. Pass records in; keep UI and database operations in their adapters.'}],
    }],
    'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'sessionStorage', 'fetch'],
    'no-restricted-syntax': ['error', {selector: 'ImportExpression', message: 'Do not bypass financial module boundaries through dynamic imports.'}],
  },
}];
