"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			ALTER TABLE "Backlogs"
			ADD COLUMN IF NOT EXISTS "compilationGameId" UUID;
		`);

		await queryInterface.sequelize.query(`
			DO $$ BEGIN
				ALTER TABLE "Backlogs"
				ADD CONSTRAINT "backlogs_compilation_game_fk"
				FOREIGN KEY ("compilationGameId") REFERENCES "Games"(id);
			EXCEPTION WHEN duplicate_object THEN null; END $$;
		`);

		await queryInterface.sequelize.query(`
			CREATE INDEX IF NOT EXISTS "backlogs_compilation_game_idx"
			ON "Backlogs" ("compilationGameId");
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			DROP INDEX IF EXISTS "backlogs_compilation_game_idx";
		`);
		await queryInterface.sequelize.query(`
			ALTER TABLE "Backlogs" DROP CONSTRAINT IF EXISTS "backlogs_compilation_game_fk";
		`);
		await queryInterface.sequelize.query(`
			ALTER TABLE "Backlogs" DROP COLUMN IF EXISTS "compilationGameId";
		`);
	}
};
