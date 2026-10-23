import { Genre } from "../../src/genres/genres.model";
import { Platform } from "../../src/platforms/platform.model";
import { createScoreSource } from "../helpers/factories.helper";

const PLATFORM_CODES = ["playstation-5", "xbox-series-xors", "nintendo-switch"];

const GENRE_CODES = [
	"action",
	"rpg",
	"soulslike",
	"indie",
	"platformer",
	"metroidvania"
];

export async function seedRawgCatalog() {
	await createScoreSource({ code: "metacritic", scale: 100, priority: 10 });
	await Platform.bulkCreate(
		PLATFORM_CODES.map(code => ({
			name: `Platform ${code}`,
			code,
			abbreviation: code.slice(0, 10).toUpperCase(),
			manufacturer: "Completr Test"
		}))
	);
	await Genre.bulkCreate(
		GENRE_CODES.map(code => ({ name: `Genre ${code}`, code }))
	);
}
