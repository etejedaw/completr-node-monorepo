// @ts-check
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

import { contactEndpointCheck } from "./contact-endpoint-check.mjs";

// matches "https://www.completr.app/", ".../es/gracias/" and ".../en/404/"
const unindexedPages = /^https?:\/\/[^/]+\/(?:(?:es|en)\/(?:gracias|404)\/)?$/;

// https://astro.build/config
export default defineConfig({
	site: "https://www.completr.app",
	i18n: {
		locales: ["es", "en"],
		defaultLocale: "es",
		routing: {
			prefixDefaultLocale: true,
			redirectToDefaultLocale: false
		}
	},
	integrations: [
		contactEndpointCheck(),
		sitemap({
			i18n: {
				defaultLocale: "es",
				locales: { es: "es", en: "en" }
			},
			filter: page => !unindexedPages.test(page)
		})
	],
	vite: {
		plugins: [tailwindcss()],
		build: {
			assetsInlineLimit: 0
		}
	}
});
