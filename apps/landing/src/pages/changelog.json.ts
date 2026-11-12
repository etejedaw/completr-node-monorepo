import type { APIRoute } from "astro";

import { getReleasesNewestFirst } from "../utils/releases";

export const GET: APIRoute = async () => {
	const sorted = await getReleasesNewestFirst();

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
