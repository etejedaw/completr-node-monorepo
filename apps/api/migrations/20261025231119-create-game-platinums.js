"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			CREATE TABLE IF NOT EXISTS "GamePlatinums" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				"userId" UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
				"gameId" UUID NOT NULL REFERENCES "Games"(id) ON DELETE CASCADE,
				"backlogId" UUID REFERENCES "Backlogs"(id) ON DELETE SET NULL,
				"platformId" UUID REFERENCES "Platforms"(id),
				"platinumedAt" DATE,
				notes VARCHAR(500),
				"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
				"updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
			);
			CREATE UNIQUE INDEX IF NOT EXISTS "GamePlatinums_userId_gameId_uidx"
			ON "GamePlatinums"("userId", "gameId");
			CREATE INDEX IF NOT EXISTS "GamePlatinums_gameId_idx"
			ON "GamePlatinums"("gameId");
			CREATE INDEX IF NOT EXISTS "GamePlatinums_backlogId_idx"
			ON "GamePlatinums"("backlogId");
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			DROP TABLE IF EXISTS "GamePlatinums";
		`);
	}
};
