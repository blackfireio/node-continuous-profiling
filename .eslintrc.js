const stylistic = require('@stylistic/eslint-plugin');

const customized = stylistic.configs.customize({
    indent: 2,
    quotes: 'single',
    semi: true,
    jsx: false,
    arrowParens: true,
    braceStyle: '1tbs',
    quoteProps: 'as-needed',
});

module.exports = {
    env: {
        browser: true,
        node: true,
        jest: true,
    },
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    plugins: [
        '@stylistic',
    ],
    extends: [
        'eslint:recommended',
        'plugin:@stylistic/recommended-extends',
    ],
    rules: {
        ...customized.rules,
        'no-console': ['error'],
    },
};
