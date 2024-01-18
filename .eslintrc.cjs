module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: [
      './tsconfig.json',
      './tsconfig.node.json',
      './tests/tsconfig.json',
    ],
    tsconfigRootDir: __dirname,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/strict-type-checked',
    'plugin:@typescript-eslint/stylistic-type-checked',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['coverage', 'dist', 'libauth', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import', 'react-refresh'],
  settings: {
    react: { version: 'detect' },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
  },
  reportUnusedDisableDirectives: true,
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/consistent-indexed-object-style': [
      'error',
      'index-signature',
    ],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
    'import/no-unresolved': 'error',
    'import/first': 'error',
    'import/newline-after-import': 'error',
    'import/no-absolute-path': 'error',
    'import/no-amd': 'error',
    'import/no-cycle': 'error',
    'import/no-default-export': 'error',
    'import/no-mutable-exports': 'error',
    'import/no-named-default': 'error',
    'import/no-commonjs': 'error',
    'import/no-named-export': 'off',
    'import/no-self-import': 'error',
    'import/no-useless-path-segments': 'error',
    'import/order': [
      'error',
      {
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
        },
      },
    ],
    'no-duplicate-imports': 'off',
    'import/no-duplicates': 'error',
    'sort-imports': [
      'error',
      {
        ignoreDeclarationSort: true,
        ignoreCase: true,
      },
    ],
    'import/prefer-default-export': 'off',
  },
};
