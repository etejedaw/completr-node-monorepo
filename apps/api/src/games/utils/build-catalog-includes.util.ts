import { type Includeable } from "sequelize";

export function buildCatalogIncludes(): Includeable[] {
	return [
		{ association: "Platforms" },
		{ association: "Genres" },
		{ association: "GameScores" },
		{ association: "GameTimes" }
	];
}
