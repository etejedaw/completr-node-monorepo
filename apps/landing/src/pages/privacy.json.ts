import type { APIRoute } from "astro";

import { loadPrivacyPolicy } from "../utils/privacy-policy";

export const GET: APIRoute = async () => {
	const policy = await loadPrivacyPolicy("en");

	return new Response(JSON.stringify(policy), {
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"Access-Control-Allow-Origin": "*",
			"Cache-Control": "public, max-age=300"
		}
	});
};
