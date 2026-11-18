"use strict";

module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(
			`CREATE INDEX IF NOT EXISTS "usergametags_tag_game_idx" ON "UserGameTags" ("tag", "gameId");`
		);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(
			`DROP INDEX IF EXISTS "usergametags_tag_game_idx";`
		);
	}
};
