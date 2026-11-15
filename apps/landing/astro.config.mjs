// @ts-check
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

import { contactEndpointCheck } from "./contact-endpoint-check.mjs";

// https://astro.build/config
export default defineConfig({
	site: "https://www.completr.app",
	integrations: [contactEndpointCheck(), sitemap()],
	vite: {
		plugins: [tailwindcss()],
		build: {
			assetsInlineLimit: 0
		}
	}
});
