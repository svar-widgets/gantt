module.exports = {
	root: true,
	env: {
		browser: true,
		node: true,
		es6: true,
	},
	extends: [
		"plugin:cypress/recommended",
		"eslint:recommended",
		"prettier",
		"plugin:svelte/recommended",
	],
	parserOptions: {
		ecmaVersion: 2020,
		sourceType: "module",
		extraFileExtensions: [".svelte"],
	},
	overrides: [
		{
			files: ["*.svelte"],
			parser: "svelte-eslint-parser",
		},
	],
	rules: {
		"cypress/no-unnecessary-waiting": 0,
		"cypress/no-assigning-return-values": 0,
		"no-bitwise": ["error"],
	},
};
