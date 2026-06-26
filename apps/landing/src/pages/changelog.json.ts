import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

export const GET: APIRoute = async () => {
	const entries = await getCollection("releases");

	const sorted = [...entries].sort((a, b) => {
		if (a.data.date !== b.data.date)
			return a.data.date < b.data.date ? 1 : -1;
		return b.data.order - a.data.order;
	});

	const releases = sorted.map(entry => ({
		date: entry.data.date,
		tag: entry.data.tag,
		title: entry.data.title,
		icon: entry.data.icon,
		tint: entry.data.tint,
		highlights: entry.data.highlights
	}));

	return new Response(JSON.stringify({ releases }), {
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"Access-Control-Allow-Origin": "*",
			"Cache-Control": "public, max-age=300"
		}
	});
};
