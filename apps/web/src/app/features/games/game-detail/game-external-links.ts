const NUMERIC_ID_PATTERN = /^\d+$/;
const IGDB_SHORT_ID_RADIX = 36;

export const EXTERNAL_LINK_SOURCES: Record<
	string,
	{ label: string; url: (externalId: string) => string | null }
> = {
	rawg: { label: "RAWG", url: id => `https://rawg.io/games/${id}` },
	igdb: { label: "IGDB", url: igdbShortUrl },
	steam: {
		label: "Steam",
		url: id => `https://store.steampowered.com/app/${id}`
	},
	metacritic: {
		label: "Metacritic",
		url: id => `https://www.metacritic.com/game/${id}`
	}
};

function igdbShortUrl(externalId: string): string | null {
	if (!NUMERIC_ID_PATTERN.test(externalId)) return null;
	const shortId = Number(externalId).toString(IGDB_SHORT_ID_RADIX);
	return `https://www.igdb.com/g/${shortId}`;
}
