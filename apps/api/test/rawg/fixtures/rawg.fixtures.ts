import {
	type RawgGameDetail,
	type RawgGameSearchResult,
	type RawgSearchResponse
} from "../../../src/rawg/rawg.interface";

export const ELDEN_RING_SEARCH_RESULT: RawgGameSearchResult = {
	id: 326243,
	slug: "elden-ring",
	name: "Elden Ring",
	released: "2022-02-25",
	background_image: "https://media.rawg.io/media/games/b29/elden-ring.jpg",
	metacritic: 96,
	rating: 4.4,
	playtime: 55,
	genres: [
		{ id: 4, name: "Action", slug: "action" },
		{ id: 5, name: "RPG", slug: "role-playing-games-rpg" }
	],
	tags: [
		{ id: 31, name: "Singleplayer", slug: "singleplayer", language: "eng" },
		{ id: 1500, name: "Soulslike", slug: "soulslike", language: "eng" },
		{ id: 1501, name: "Roguelike", slug: "roguelike", language: "rus" }
	],
	platforms: [
		{
			platform: { id: 187, name: "PlayStation 5", slug: "playstation5" }
		},
		{
			platform: {
				id: 186,
				name: "Xbox Series S/X",
				slug: "xbox-series-x"
			}
		}
	]
};

export const ELDEN_RING_DETAIL: RawgGameDetail = {
	...ELDEN_RING_SEARCH_RESULT,
	description_raw: "Rise, Tarnished, and become an Elden Lord.",
	website: "https://en.bandainamcoent.eu/elden-ring/elden-ring"
};

export const HOLLOW_KNIGHT_SEARCH_RESULT: RawgGameSearchResult = {
	id: 9767,
	slug: "hollow-knight",
	name: "Hollow Knight",
	released: "2017-02-24",
	background_image: "https://media.rawg.io/media/games/4cf/hollow-knight.jpg",
	metacritic: 87,
	rating: 4.35,
	playtime: 14,
	genres: [
		{ id: 51, name: "Indie", slug: "indie" },
		{ id: 83, name: "Platformer", slug: "platformer" }
	],
	tags: [
		{
			id: 1495,
			name: "Metroidvania",
			slug: "metroidvania",
			language: "eng"
		}
	],
	platforms: [
		{
			platform: {
				id: 7,
				name: "Nintendo Switch",
				slug: "nintendo-switch"
			}
		}
	]
};

export const HOLLOW_KNIGHT_DETAIL: RawgGameDetail = {
	...HOLLOW_KNIGHT_SEARCH_RESULT,
	description_raw: "Descend into the ruined kingdom of Hallownest.",
	website: "https://hollowknight.com"
};

export const UNRATED_SEARCH_RESULT: RawgGameSearchResult = {
	id: 770001,
	slug: "obscure-prototype",
	name: "Obscure Prototype",
	released: null,
	background_image: null,
	metacritic: null,
	rating: 0,
	playtime: 0,
	genres: [],
	tags: [],
	platforms: []
};

export const UNRATED_DETAIL: RawgGameDetail = {
	...UNRATED_SEARCH_RESULT,
	description_raw: null,
	website: null
};

export const SEARCH_RESPONSE: RawgSearchResponse = {
	count: 2,
	next: null,
	results: [ELDEN_RING_SEARCH_RESULT, HOLLOW_KNIGHT_SEARCH_RESULT]
};

export const EMPTY_SEARCH_RESPONSE: RawgSearchResponse = {
	count: 0,
	next: null,
	results: []
};
