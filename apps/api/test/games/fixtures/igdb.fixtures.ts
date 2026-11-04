import {
	type IgdbGame,
	type IgdbNamedRef
} from "../../../src/igdb/igdb.interface";

export function igdbRefs(...slugs: string[]): IgdbNamedRef[] {
	return slugs.map((slug, index) => ({ id: index + 1, slug }));
}

export function buildIgdbGame(overrides: Partial<IgdbGame> = {}): IgdbGame {
	return {
		id: 1,
		name: "Fixture Quest",
		slug: "fixture-quest",
		...overrides
	};
}

export const COMPLETE_IGDB_GAME: IgdbGame = {
	id: 113112,
	name: "Fixture Quest",
	slug: "fixture-quest",
	summary: "A rogue-lite dungeon crawler about a fixture.",
	first_release_date: 1600300800,
	rating: 89.43176758204031,
	rating_count: 1780,
	url: "https://www.igdb.com/games/fixture-quest",
	game_type: { id: 0, type: "Main Game" },
	cover: { id: 525627, image_id: "co1abc" },
	platforms: igdbRefs("series-x-s", "ps4--1", "win", "ios", "ps5", "switch"),
	genres: igdbRefs("role-playing-rpg", "hack-and-slash-beat-em-up", "indie"),
	themes: igdbRefs("action", "fantasy")
};
