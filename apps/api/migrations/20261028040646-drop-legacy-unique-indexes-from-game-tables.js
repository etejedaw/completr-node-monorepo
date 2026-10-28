"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(
			`DROP INDEX IF EXISTS "game_externals_source_external_id";`
		);
		await queryInterface.sequelize.query(
			`DROP INDEX IF EXISTS "game_scores_game_id_source";`
		);
		await queryInterface.sequelize.query(
			`DROP INDEX IF EXISTS "game_times_game_id_source";`
		);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			CREATE UNIQUE INDEX IF NOT EXISTS "game_times_game_id_source"
			ON "GameTimes" ("gameId", source);
		`);
		await queryInterface.sequelize.query(`
			CREATE UNIQUE INDEX IF NOT EXISTS "game_scores_game_id_source"
			ON "GameScores" ("gameId", source);
		`);
		await queryInterface.sequelize.query(`
			CREATE UNIQUE INDEX IF NOT EXISTS "game_externals_source_external_id"
			ON "GameExternals" (source, "externalId");
		`);
	}
};
