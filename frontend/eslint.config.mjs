import { dirname } from 'path';
import { fileURLToPath } from 'url';

import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
});

const eslintConfig = [
    {
        ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'],
    },
    ...compat.config({
        extends: ['next/core-web-vitals', 'next/typescript', 'prettier'],
        plugins: ['import', '@typescript-eslint'],
        rules: {
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],

            'import/order': [
                'error',
                {
                    groups: [
                        'builtin',
                        'external',
                        'internal',
                        ['parent', 'sibling'],
                        'index',
                        'type',
                    ],
                    pathGroups: [
                        { pattern: 'react', group: 'builtin', position: 'before' },
                        { pattern: 'next/**', group: 'builtin', position: 'before' },
                        { pattern: '@/features/**', group: 'internal', position: 'before' },
                        { pattern: '@/components/ui/**', group: 'internal', position: 'before' },
                        { pattern: '@/components/**', group: 'internal', position: 'before' },
                        { pattern: '@/**', group: 'internal' },
                    ],
                    pathGroupsExcludedImportTypes: ['type'],
                    'newlines-between': 'always',
                    alphabetize: { order: 'asc', caseInsensitive: true },
                },
            ],
            'import/no-duplicates': 'error',

            'no-console': ['warn', { allow: ['warn', 'error'] }],
            'prefer-const': 'error',
            'no-var': 'error',
            eqeqeq: ['error', 'always'],

            'react/jsx-curly-brace-presence': ['error', { props: 'never', children: 'never' }],
            'react-hooks/exhaustive-deps': 'warn',

            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['../**/components/ui/*'],
                            message: 'Import UI components from @/components/ui instead',
                        },
                    ],
                },
            ],
        },
        settings: {
            'import/resolver': {
                typescript: { alwaysTryTypes: true },
            },
        },
    }),
];

export default eslintConfig;
