"use strict";

module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			CREATE UNIQUE INDEX IF NOT EXISTS "gametimes_gameid_source_unique_idx"
			ON "GameTimes" ("gameId", source);
		`);
		await queryInterface.sequelize.query(`
			CREATE UNIQUE INDEX IF NOT EXISTS "gamescores_gameid_source_unique_idx"
			ON "GameScores" ("gameId", source);
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(
			`DROP INDEX IF EXISTS "gametimes_gameid_source_unique_idx";`
		);
		await queryInterface.sequelize.query(
			`DROP INDEX IF EXISTS "gamescores_gameid_source_unique_idx";`
		);
	}
};
