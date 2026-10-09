const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/**', 'dist/**', 'assets/**'] },
  js.configs.recommended,
  {
    // Electron main process, preload, build scripts and tests run in Node.
    files: ['main.js', 'preload.js', 'scripts/**/*.js', 'test/**/*.js', 'eslint.config.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs', globals: { ...globals.node } },
  },
  {
    // Renderer files are classic <script> tags sharing one global scope, so
    // cross-file references can't be resolved per file.
    files: ['src/**/*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: { ...globals.browser } },
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off',
      // render.js uses zero-width spaces inside SVG template strings on purpose.
      'no-irregular-whitespace': ['error', { skipTemplates: true }],
    },
  },
];
