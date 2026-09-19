import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

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

export const collections = { releases };
