import eslintPluginAstro from "eslint-plugin-astro";
import tseslint from "typescript-eslint";

export default [
	...tseslint.configs.recommended,
	...eslintPluginAstro.configs.recommended,
	{
		ignores: [".astro/**", "dist/", "scripts/", "tmp/"]
	},
	{
		rules: {
			"no-unused-vars": "warn",
			"no-console": "warn"
		}
	}
];
