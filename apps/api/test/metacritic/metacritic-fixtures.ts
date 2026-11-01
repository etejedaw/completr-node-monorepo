import { readFileSync } from "node:fs";
import { join } from "node:path";

const JSON_LD_PATTERN =
	/<script type="application\/ld\+json">[\s\S]*?<\/script>/;

export function readMetacriticFixture(name: string) {
	return readFileSync(join(__dirname, "fixtures", name), "utf8");
}

export const WITCHER_3_PAGE = readMetacriticFixture(
	"the-witcher-3-wild-hunt.html"
);
export const UNRELEASED_TBD_PAGE = readMetacriticFixture(
	"grand-theft-auto-vi.html"
);
export const NOT_FOUND_PAGE = readMetacriticFixture("not-found.html");

export function withJsonLd(html: string, jsonLd: unknown) {
	const script =
		jsonLd === undefined
			? ""
			: `<script type="application/ld+json">${typeof jsonLd === "string" ? jsonLd : JSON.stringify(jsonLd)}</script>`;
	return html.replace(JSON_LD_PATTERN, () => script);
}

export function withJsonLdFields(
	html: string,
	fields: Record<string, unknown>,
	removedFields: string[] = []
) {
	const json =
		/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(
			html
		)?.[1];
	if (!json) throw new Error("Fixture without JSON-LD");

	const videoGame = JSON.parse(json) as Record<string, unknown>;
	Object.assign(
		videoGame,
		fields,
		Object.fromEntries(removedFields.map(field => [field, undefined]))
	);

	return withJsonLd(html, videoGame);
}

export function withScoreLabel(html: string, from: string, to: string) {
	return html.replaceAll(`"${from}"`, `"${to}"`);
}
