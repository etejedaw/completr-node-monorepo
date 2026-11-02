import { readFileSync } from "node:fs";
import { join } from "node:path";

const NEXT_DATA_PATTERN =
	/(<script id="__NEXT_DATA__" type="application\/json">)([\s\S]*?)(<\/script>)/;

export function readHltbFixture(name: string) {
	return readFileSync(join(__dirname, "fixtures", name), "utf8");
}

export const WITCHER_3_PAGE = readHltbFixture("game-10270.html");
export const BLOOD_AND_WINE_DLC_PAGE = readHltbFixture("game-33660-dlc.html");
export const NOT_FOUND_PAGE = readHltbFixture("not-found.html");

export function withNextData(html: string, nextDataJson: string) {
	return html.replace(
		NEXT_DATA_PATTERN,
		(_match, open: string, _json: string, close: string) =>
			`${open}${nextDataJson}${close}`
	);
}

export function withGameFields(
	html: string,
	fields: Record<string, unknown>,
	removedFields: string[] = []
) {
	const json = NEXT_DATA_PATTERN.exec(html)?.[2];
	if (!json) throw new Error("Fixture without __NEXT_DATA__");

	const nextData = JSON.parse(json) as {
		props: {
			pageProps: { game: { data: { game: Record<string, unknown>[] } } };
		};
	};
	const game = nextData.props.pageProps.game.data.game[0]!;
	Object.assign(
		game,
		fields,
		Object.fromEntries(removedFields.map(field => [field, undefined]))
	);

	return withNextData(html, JSON.stringify(nextData));
}
