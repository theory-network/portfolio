import nextEslintPluginNext from '@next/eslint-plugin-next';
import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  { plugins: { '@next/next': nextEslintPluginNext } },
  ...nx.configs['flat/react-typescript'],
  ...baseConfig,
  {
    ignores: ['.next/**/*', '**/out-tsc'],
    overrides: [
      {
        files: ['*.ts', '*.tsx', '*.js', '*.jsx'],
        rules: {
          '@nrwl/nx/enforce-module-boundaries': [
            'error',
            {
              enforceBuildableLibDependency: true,
              allow: [],
              depConstraints: [
                {
                  sourceTag: '*',
                  onlyDependOnLibsWithTags: ['*'],
                },
              ],
            },
          ],
        },
      },
      {
        files: ['*.ts', '*.tsx'],
        extends: ['plugin:@nrwl/nx/typescript'],
        rules: {},
      },
      {
        files: ['*.js', '*.jsx'],
        extends: ['plugin:@nrwl/nx/javascript'],
        rules: {},
      },
      {
        files: ['*.ts', '*.tsx', '*.js', '*.jsx'],
        rules: {
          'max-len': ['error', { code: 140 }],
          'no-extra-boolean-cast': 'off',
          quotes: ['error', 'single', { avoidEscape: true }],
          '@typescript-eslint/no-unused-vars': [
            'warn',
            { argsIgnorePattern: '_' },
          ],
          '@typescript-eslint/no-inferrable-types': 'off',
        },
      },
    ],
  },
];
