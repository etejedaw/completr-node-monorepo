"use strict";

module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			CREATE TABLE IF NOT EXISTS "CoopRuns" (
				"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				"gameId" UUID NOT NULL REFERENCES "Games"("id") ON DELETE CASCADE,
				"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
			);
		`);

		await queryInterface.sequelize.query(
			`CREATE INDEX IF NOT EXISTS "cooprun_game_idx" ON "CoopRuns" ("gameId");`
		);

		await queryInterface.sequelize.query(`
			ALTER TABLE "Backlogs"
				ADD COLUMN IF NOT EXISTS "coopRunId" UUID REFERENCES "CoopRuns"("id") ON DELETE SET NULL;
		`);

		await queryInterface.sequelize.query(
			`CREATE INDEX IF NOT EXISTS "backlogs_cooprun_idx" ON "Backlogs" ("coopRunId");`
		);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(
			`ALTER TABLE "Backlogs" DROP COLUMN IF EXISTS "coopRunId";`
		);
		await queryInterface.sequelize.query(
			`DROP TABLE IF EXISTS "CoopRuns";`
		);
	}
};
