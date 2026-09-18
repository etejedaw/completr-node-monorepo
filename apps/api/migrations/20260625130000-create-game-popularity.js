"use strict";

module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			CREATE TABLE IF NOT EXISTS "GamePopularities" (
				"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				"gameId" UUID NOT NULL UNIQUE REFERENCES "Games"("id") ON DELETE CASCADE,
				"score" INTEGER NOT NULL DEFAULT 0,
				"updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
			);
		`);

		await queryInterface.sequelize.query(
			`CREATE INDEX IF NOT EXISTS "gamepopularities_score_idx" ON "GamePopularities" ("score" DESC);`
		);

		await queryInterface.sequelize.query(`
			INSERT INTO "GamePopularities" ("gameId", "score", "updatedAt")
			SELECT g."id",
				COALESCE((
					SELECT COUNT(DISTINCT gs."userId")
					FROM "GameShelves" gs
					WHERE gs."gameId" = g."id"
				), 0),
				now()
			FROM "Games" g
			ON CONFLICT ("gameId") DO NOTHING;
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(
			`DROP TABLE IF EXISTS "GamePopularities";`
		);
	}
};
