import eslintPluginAstro from "eslint-plugin-astro";

export default [
	...eslintPluginAstro.configs.recommended,
	{
		ignores: [".astro/**"]
	},
	{
		rules: {
			"no-unused-vars": "warn",
			"no-console": "warn"
		}
	}
];
