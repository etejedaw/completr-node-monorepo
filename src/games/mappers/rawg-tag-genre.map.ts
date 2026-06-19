/** Maps RAWG tag slugs to Completr genre codes for tags that are effectively subgenres */
export const RAWG_TAG_GENRE_MAP: Record<string, string> = {
	"point-and-click": "point-and-click",
	roguelike: "roguelike",
	"rogue-like": "roguelike",
	roguelite: "roguelite",
	"rogue-lite": "roguelite",
	metroidvania: "metroidvania",
	soulslike: "soulslike",
	"souls-like": "soulslike",
	"visual-novel": "visual-novel",
	"deck-building": "deck-building",
	deckbuilding: "deck-building",
	"battle-royale": "battle-royale",
	"survival-horror": "survival-horror",
	"dungeon-crawler": "dungeon-crawler",
	"auto-battler": "auto-battler"
};

export function mapRawgTagSlugsToGenres(rawgTagSlugs: string[]): string[] {
	return rawgTagSlugs
		.map(slug => RAWG_TAG_GENRE_MAP[slug])
		.filter((code): code is string => !!code);
}
