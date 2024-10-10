module.exports = {
	root: true,
	parser: "@typescript-eslint/parser",
	env: {
		browser: true,
		node: true,
		es6: true,
	},
	extends: [
		"eslint:recommended",
		"plugin:@typescript-eslint/recommended",
		"prettier",
	],
	parserOptions: {
		ecmaVersion: 2018,
		sourceType: "module",

		tsconfigRootDir: __dirname,
	},
	plugins: ["@typescript-eslint"],
	rules: {
		"no-bitwise": ["error"],
		"@typescript-eslint/explicit-module-boundary-types": "off",
		"@typescript-eslint/no-explicit-any": "off",
	},
};
