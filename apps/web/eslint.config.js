// @ts-check
const eslint = require("@eslint/js");
const { defineConfig } = require("eslint/config");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");

module.exports = defineConfig([
  {
    ignores: [".angular/**", "dist/**", "out-tsc/**"],
  },
  {
    files: ["**/*.ts"],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      "@angular-eslint/directive-selector": [
        "error",
        {
          type: "attribute",
          prefix: ["app", "ui"],
          style: "camelCase",
        },
      ],
      "@angular-eslint/component-selector": [
        "error",
        {
          type: "element",
          prefix: ["app", "ui"],
          style: "kebab-case",
        },
      ],
    },
  },
  {
    // Design-system components that augment native elements via an attribute
    // selector (e.g. <button uiButton>) follow the camelCase attribute convention.
    files: [
      "src/app/shared/ui/button/**/*.ts",
      "src/app/shared/ui/icon-button/**/*.ts",
    ],
    rules: {
      "@angular-eslint/component-selector": [
        "error",
        {
          type: "attribute",
          prefix: ["app", "ui"],
          style: "camelCase",
        },
      ],
    },
  },
  {
    files: ["**/*.html"],
    extends: [
      angular.configs.templateRecommended,
      angular.configs.templateAccessibility,
    ],
    rules: {},
  },
]);
