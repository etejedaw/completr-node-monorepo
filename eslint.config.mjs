// @ts-check

import eslint from "@eslint/js";
import angular from "angular-eslint";
import { defineConfig } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import tseslint from "typescript-eslint";

export default defineConfig(
	{
		ignores: [
			"**/dist",
			"**/coverage",
			"**/node_modules",
			"**/.angular",
			"**/out-tsc",
			"tmp",
			".claude/skills/frontend-design",
			"apps/api/logs",
			"apps/api/migrations",
			"apps/api/.sequelizerc",
			"**/*.migrate.js"
		]
	},

	{
		files: ["**/*.{ts,js,mjs}"],
		extends: [
			eslint.configs.recommended,
			tseslint.configs.recommended,
			tseslint.configs.strict,
			tseslint.configs.stylistic
		],
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
			"no-console": ["warn", { allow: ["warn", "error"] }],
			eqeqeq: ["error", "always"]
		}
	},

	{
		files: ["apps/api/src/**/*.ts", "apps/api/scripts/**/*.ts"],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname
			}
		},
		rules: {
			"@typescript-eslint/no-floating-promises": "error",
			"@typescript-eslint/no-misused-promises": "error"
		}
	},

	{
		files: ["apps/web/**/*.ts"],
		extends: [angular.configs.tsRecommended],
		processor: angular.processInlineTemplates,
		rules: {
			"@angular-eslint/directive-selector": [
				"error",
				{ type: "attribute", prefix: ["app", "ui"], style: "camelCase" }
			],
			"@angular-eslint/component-selector": [
				"error",
				{ type: "element", prefix: ["app", "ui"], style: "kebab-case" }
			],
			"@typescript-eslint/no-extraneous-class": [
				"error",
				{ allowWithDecorator: true }
			],
			eqeqeq: ["error", "always", { null: "ignore" }],
			"@typescript-eslint/no-invalid-void-type": "off"
		}
	},
	{
		// Design-system components that augment native elements via an attribute
		// selector (e.g. <button uiButton>) follow the camelCase attribute convention.
		files: [
			"apps/web/src/app/shared/ui/button/**/*.ts",
			"apps/web/src/app/shared/ui/icon-button/**/*.ts"
		],
		rules: {
			"@angular-eslint/component-selector": [
				"error",
				{ type: "attribute", prefix: ["app", "ui"], style: "camelCase" }
			]
		}
	},
	{
		files: ["apps/web/**/*.html"],
		extends: [
			angular.configs.templateRecommended,
			angular.configs.templateAccessibility
		]
	},

	eslintConfigPrettier
);
