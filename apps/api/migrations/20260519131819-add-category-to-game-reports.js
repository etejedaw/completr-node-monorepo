"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			DO $$ BEGIN
				CREATE TYPE "enum_GameReports_category" AS ENUM ('general', 'missing_score', 'missing_duration');
			EXCEPTION WHEN duplicate_object THEN null; END $$;

			ALTER TABLE "GameReports"
			ADD COLUMN IF NOT EXISTS "category" "enum_GameReports_category" NOT NULL DEFAULT 'general';

			ALTER TABLE "GameReports"
			DROP CONSTRAINT IF EXISTS "GameReports_gameId_userId_key";

			ALTER TABLE "GameReports"
			DROP CONSTRAINT IF EXISTS "GameReports_gameId_userId_category_key";

			ALTER TABLE "GameReports"
			ADD CONSTRAINT "GameReports_gameId_userId_category_key" UNIQUE ("gameId", "userId", "category");
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			ALTER TABLE "GameReports"
			DROP CONSTRAINT IF EXISTS "GameReports_gameId_userId_category_key";

			ALTER TABLE "GameReports"
			ADD CONSTRAINT "GameReports_gameId_userId_key" UNIQUE ("gameId", "userId");

			ALTER TABLE "GameReports"
			DROP COLUMN IF EXISTS "category";

			DROP TYPE IF EXISTS "enum_GameReports_category";
		`);
	}
};
