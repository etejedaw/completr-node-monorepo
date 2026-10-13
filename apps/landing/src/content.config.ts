import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection } from "astro:content";

const tint = z.enum(["brand", "purple", "warning", "success", "danger"]);

const releases = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/releases" }),
	schema: z.object({
		date: z
			.union([z.string(), z.date()])
			.transform(value =>
				value instanceof Date ? value.toISOString().slice(0, 10) : value
			),
		order: z.number().default(0),
		tag: z.string(),
		title: z.string(),
		icon: z.string(),
		tint,
		landing: z
			.object({
				featured: z.boolean().default(false),
				image: z.string().optional(),
				pitch: z.string()
			})
			.optional(),
		highlights: z.array(
			z.object({
				icon: z.string(),
				tint,
				text: z.string()
			})
		)
	})
});

const legal = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/legal" }),
	schema: z.object({
		lang: z.enum(["es", "en"]),
		version: z.string(),
		updated: z
			.union([z.string(), z.date()])
			.transform(value =>
				value instanceof Date ? value.toISOString().slice(0, 10) : value
			),
		title: z.string(),
		summary: z.string(),
		highlights: z.array(
			z.object({
				section: z.string(),
				icon: z.string(),
				title: z.string(),
				text: z.string()
			})
		),
		sections: z.array(
			z.object({
				id: z.string(),
				label: z.string(),
				icon: z.string()
			})
		)
	})
});

export const collections = { releases, legal };
