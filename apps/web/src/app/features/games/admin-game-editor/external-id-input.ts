// Matches https://www.howlongtobeat.com/game/10270/?ref=x and returns 10270.
const HLTB_GAME_URL =
	/^(?:https?:\/\/)?(?:www\.)?howlongtobeat\.com\/game\/(\d+)\/?(?:[?#].*)?$/i;
// Matches https://www.metacritic.com/game/pc/the-witcher-3-wild-hunt/ and returns ["pc", "the-witcher-3-wild-hunt"].
const METACRITIC_GAME_URL =
	/^(?:https?:\/\/)?(?:www\.)?metacritic\.com\/game\/([^/?#]+)(?:\/([^/?#]+))?(?:[/?#].*)?$/i;
const METACRITIC_LEGACY_PLATFORMS = new Set([
	"pc",
	"playstation",
	"playstation-2",
	"playstation-3",
	"playstation-4",
	"playstation-5",
	"psp",
	"playstation-vita",
	"xbox",
	"xbox-360",
	"xbox-one",
	"xbox-series-x",
	"switch",
	"wii",
	"wii-u",
	"gamecube",
	"nintendo-64",
	"ds",
	"3ds",
	"game-boy-advance",
	"dreamcast",
	"ios",
	"stadia"
]);
const POSITIVE_INTEGER = /^\d+$/;
const METACRITIC_SLUG = /^[a-z0-9]+(?:-+[a-z0-9]+)*$/;

export function normalizeHltbId(raw: string): string | null {
	const trimmed = raw.trim();
	if (!trimmed) return "";
	const candidate = HLTB_GAME_URL.exec(trimmed)?.[1] ?? trimmed;
	if (!POSITIVE_INTEGER.test(candidate)) return null;
	const withoutLeadingZeros = candidate.replace(/^0+/, "");
	return withoutLeadingZeros || null;
}

export function normalizeMetacriticSlug(raw: string): string | null {
	const trimmed = raw.trim();
	if (!trimmed) return "";
	const candidate = metacriticSlugCandidate(trimmed).toLowerCase();
	return METACRITIC_SLUG.test(candidate) ? candidate : null;
}

function metacriticSlugCandidate(input: string): string {
	const match = METACRITIC_GAME_URL.exec(input);
	if (!match) return input;
	const [, firstSegment, secondSegment] = match;
	const isLegacyPlatformUrl =
		!!secondSegment &&
		METACRITIC_LEGACY_PLATFORMS.has(firstSegment.toLowerCase());
	return isLegacyPlatformUrl ? secondSegment : firstSegment;
}

export function buildHltbSearchUrl(title: string): string | null {
	const query = title.trim();
	return query
		? `https://howlongtobeat.com/?q=${encodeURIComponent(query)}`
		: null;
}

export function buildMetacriticGameUrl(slug: string): string {
	return `https://www.metacritic.com/game/${slug}/`;
}
