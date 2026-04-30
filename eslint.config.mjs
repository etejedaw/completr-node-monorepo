// @ts-check

import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default defineConfig(
	{
		ignores: [
			"dist",
			"coverage",
			"node_modules",
			"logs",
			"migrations",
			".sequelizerc",
			"**/*.migrate.js",
			"scripts"
		]
	},
	eslint.configs.recommended,
	tseslint.configs.recommended,
	tseslint.configs.strict,
	tseslint.configs.stylistic,
	{
		rules: {
			"@typescript-eslint/no-non-null-assertion": "off",
			"@typescript-eslint/consistent-type-definitions": "off",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ varsIgnorePattern: "^_", argsIgnorePattern: "^_" }
			]
		}
	},
	eslintConfigPrettier
);
