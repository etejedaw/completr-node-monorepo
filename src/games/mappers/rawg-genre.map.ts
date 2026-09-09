export const RAWG_GENRE_MAP: Record<string, string> = {
	action: "action",
	indie: "indie",
	adventure: "adventure",
	"role-playing-games-rpg": "rpg",
	strategy: "strategy",
	shooter: "shooter",
	casual: "casual",
	simulation: "simulation",
	puzzle: "puzzle",
	arcade: "arcade",
	platformer: "platformer",
	"massively-multiplayer": "massively-multiplayer",
	racing: "racing",
	sports: "sports",
	fighting: "fighting",
	family: "family",
	"board-games": "board-games",
	card: "card-game",
	educational: "educational"
};

export function mapRawgGenreSlugs(rawgSlugs: string[]): string[] {
	return rawgSlugs
		.map(slug => RAWG_GENRE_MAP[slug])
		.filter((code): code is string => !!code);
}
