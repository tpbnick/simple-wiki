/** @type {import('prettier').Config} */
export default {
  plugins: ['prettier-plugin-svelte'],
  semi: false,
  singleQuote: true,
  trailingComma: 'none',
  printWidth: 100,
  svelteIndentScriptAndStyle: false,
  overrides: [{ files: '*.svelte', options: { parser: 'svelte' } }]
}
