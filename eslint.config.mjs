// @ts-check

import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import tseslint from "typescript-eslint";

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
		plugins: {
			"simple-import-sort": simpleImportSort
		},
		rules: {
			"@typescript-eslint/no-non-null-assertion": "off",
			"@typescript-eslint/consistent-type-definitions": "off",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ varsIgnorePattern: "^_", argsIgnorePattern: "^_" }
			],
			curly: ["error", "all"],
			"simple-import-sort/imports": "error",
			"simple-import-sort/exports": "error",
			"@typescript-eslint/consistent-type-imports": [
				"error",
				{ fixStyle: "inline-type-imports" }
			],
			"no-console": ["warn", { allow: ["warn", "error"] }]
		}
	},
	{
		files: ["src/server.ts", "src/database/sequelize.database.ts"],
		rules: {
			"no-console": "off"
		}
	},
	eslintConfigPrettier
);
