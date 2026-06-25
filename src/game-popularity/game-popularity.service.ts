import { QueryTypes } from "sequelize";
import { sequelize } from "../database/sequelize.database";

export async function recomputeAllPopularity(): Promise<number> {
	await sequelize.query(
		`
		INSERT INTO "GamePopularities" ("gameId", "score", "updatedAt")
		SELECT g."id",
			COALESCE((
				SELECT COUNT(DISTINCT gs."userId")
				FROM "GameShelves" gs
				WHERE gs."gameId" = g."id"
			), 0),
			now()
		FROM "Games" g
		ON CONFLICT ("gameId") DO UPDATE
			SET "score" = EXCLUDED."score",
				"updatedAt" = EXCLUDED."updatedAt"
		`,
		{ type: QueryTypes.INSERT }
	);

	const [{ total }] = (await sequelize.query(
		`SELECT COUNT(*)::int AS total FROM "GamePopularities"`,
		{ type: QueryTypes.SELECT }
	)) as unknown as [{ total: number }];

	return total;
}
