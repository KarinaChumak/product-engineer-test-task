import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y-x';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'playwright-report', 'test-results', '.verify']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      jsxA11y.configs.recommended,
      // Includes the React Compiler rules.
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: { globals: globals.browser },
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: ['../*'], message: 'Use the @/ alias.' }] }],
    },
  },
  {
    // Screens in src/app compose components from src/components/, where all the styling lives.
    files: ['src/app/**/*.tsx'],
    ignores: ['**/*.test.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['../*'], message: 'Use the @/ alias.' },
            {
              group: ['*.css'],
              message: 'Screens have no styles. Put them in a component in src/components/.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXOpeningElement[name.type='JSXIdentifier'][name.name=/^[a-z]/]",
          message: 'Screens render only components. Use or add one in src/components/, like Stack or Card.',
        },
        {
          selector: 'JSXAttribute[name.name=/^(className|style)$/]',
          message: 'Screens have no styles. Give the component in src/components/ a prop instead.',
        },
      ],
    },
  },
  {
    files: ['src/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='stubGlobal'][arguments.0.value='fetch']",
          message: 'Mock the network with MSW: server.use(http.get(...)) from @/test/server.',
        },
        {
          selector:
            "AssignmentExpression[left.object.name=/^(globalThis|window)$/][left.property.name='fetch']",
          message: 'Mock the network with MSW: server.use(http.get(...)) from @/test/server.',
        },
        {
          selector: "CallExpression[callee.property.name=/^(spyOn|stubGlobal)$/][arguments.0.name='console']",
          message: "Don't mock console. If the code logs in a test, fix the code or the test.",
        },
        {
          selector: "AssignmentExpression[left.object.name='console']",
          message: "Don't mock console. If the code logs in a test, fix the code or the test.",
        },
      ],
    },
  },
]);
