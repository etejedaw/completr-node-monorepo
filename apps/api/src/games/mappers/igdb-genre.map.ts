const IGDB_GENRE_MAP: ReadonlyMap<string, string> = new Map([
	["point-and-click", "point-and-click"],
	["fighting", "fighting"],
	["shooter", "shooter"],
	["music", "rhythm"],
	["platform", "platformer"],
	["puzzle", "puzzle"],
	["racing", "racing"],
	["real-time-strategy-rts", "real-time-strategy"],
	["role-playing-rpg", "rpg"],
	["simulator", "simulation"],
	["sport", "sports"],
	["strategy", "strategy"],
	["turn-based-strategy-tbs", "turn-based-strategy"],
	["adventure", "adventure"],
	["indie", "indie"],
	["arcade", "arcade"],
	["visual-novel", "visual-novel"],
	["action", "action"],
	["horror", "horror"],
	["survival", "survival"],
	["stealth", "stealth"],
	["sandbox", "sandbox"],
	["educational", "educational"],
	["open-world", "open-world"],
	["4x-explore-expand-exploit-and-exterminate", "strategy"]
]);

export function mapIgdbGenreSlugs(igdbSlugs: readonly string[]): string[] {
	const codes = igdbSlugs
		.map(slug => IGDB_GENRE_MAP.get(slug))
		.filter((code): code is string => !!code);

	return [...new Set(codes)];
}
