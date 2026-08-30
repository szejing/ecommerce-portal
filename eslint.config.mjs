// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt({
	files: ['**/*.vue', '**/*.ts', '**/*.js'],
	rules: {
		'vue/no-v-html': 'off',
		'vue/max-attributes-per-line': 'off',
		'vue/html-self-closing': 'off',
		'vue/multi-word-component-names': 'off',
		'vue/singleline-html-element-content-newline': 'off',
		'vue/no-multiple-template-root': 'off',
		'@typescript-eslint/no-explicit-any': 'off',
		'operator-linebreak': 'off',
		'import/order': 'off',
		'vue/html-indent': [
			'error',
			'tab',
			{
				switchCase: 1,
			},
		],
		// Let @stylistic own script indentation; core indent conflicts with TypeScript/Vue switch cases.
		'indent': 'off',
		'vue/operator-linebreak': 'off',
	},
}).override('nuxt/stylistic', {
	rules: {
		'@stylistic/arrow-parens': 'off',
		'@stylistic/indent-binary-ops': 'off',
		'@stylistic/no-mixed-spaces-and-tabs': 'off',
		'@stylistic/operator-linebreak': 'off',
	},
});
// Your custom configs here
