const js = require('@eslint/js');
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');
const security = require('eslint-plugin-security');
const noSecrets = require('eslint-plugin-no-secrets');
const nodePlugin = require('eslint-plugin-n');
const importPlugin = require('eslint-plugin-import');
const promisePlugin = require('eslint-plugin-promise');

module.exports = [
  // Ignore patterns
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '*.min.js',
      '.yarn/**',
      'tmp/**',
      'temp/**',
      'eslint.config.js', // Exclude config file itself
      '**/*.test.ts',     // Test files (not in tsconfig project)
      '**/*.spec.ts',     // Spec files (not in tsconfig project)
      'vitest.config.ts', // Vitest config (not in tsconfig project)
    ],
  },
  
  // Base recommended configuration for all files
  js.configs.recommended,
  
  // TypeScript and JavaScript files configuration
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'security': security,
      'no-secrets': noSecrets,
      'n': nodePlugin,
      'import': importPlugin,
      'promise': promisePlugin,
    },
    rules: {
      // TypeScript recommended rules
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      
      // Security rules - Critical
      'security/detect-object-injection': 'warn', // Set to warn to avoid false positives
      'security/detect-non-literal-regexp': 'error',
      'security/detect-unsafe-regex': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-child-process': 'warn',
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-non-literal-require': 'warn',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-pseudoRandomBytes': 'error',
      
      // No secrets plugin
      'no-secrets/no-secrets': ['error', { 
        tolerance: 4.5,
        additionalRegexes: {
          'Unthread Secret': 'unthread[_-]?secret',
          'Webhook Secret': 'webhook[_-]?secret',
        },
      }],
      
      // Node.js best practices
      'n/no-unsupported-features/es-syntax': 'off', // TypeScript handles this
      'n/no-missing-import': 'off', // TypeScript handles this
      'n/no-unpublished-import': 'off', // TypeScript handles this
      'n/no-deprecated-api': 'error',
      'n/no-process-exit': 'warn',
      
      // Import/Export validation
      'import/no-unresolved': 'off', // TypeScript handles this
      'import/named': 'off', // TypeScript handles this
      'import/default': 'off', // TypeScript handles this
      'import/no-duplicates': 'error',
      'import/no-cycle': 'warn',
      'import/no-self-import': 'error',
      
      // Promise handling best practices
      'promise/always-return': 'warn',
      'promise/catch-or-return': 'error',
      'promise/no-return-wrap': 'error',
      'promise/param-names': 'error',
      'promise/no-nesting': 'warn',
      'promise/no-promise-in-callback': 'warn',
      'promise/no-callback-in-promise': 'warn',
      
      // General best practices
      'no-console': 'off', // We use LogEngine but console might be needed
      'no-unused-vars': 'off', // Handled by TypeScript rule
      'no-undef': 'off', // TypeScript handles this
      'eqeqeq': ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'warn',
      'no-throw-literal': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-return-await': 'warn',
    },
  },
  
  // JavaScript-specific configuration (less strict)
  {
    files: ['**/*.js'],
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
    },
  },
  
  // Configuration files (less strict)
  {
    files: ['*.config.js', '.*.js'],
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      'no-console': 'off',
    },
  },
];
