"use strict";

module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			CREATE TABLE IF NOT EXISTS "UserGameTags" (
				"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				"userId" UUID NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
				"gameId" UUID NOT NULL REFERENCES "Games"("id") ON DELETE CASCADE,
				"tag" VARCHAR(40) NOT NULL,
				"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
			);
		`);

		await queryInterface.sequelize.query(
			`CREATE UNIQUE INDEX IF NOT EXISTS "usergametags_user_game_tag_uniq" ON "UserGameTags" ("userId", "gameId", "tag");`
		);
		await queryInterface.sequelize.query(
			`CREATE INDEX IF NOT EXISTS "usergametags_user_tag_idx" ON "UserGameTags" ("userId", "tag");`
		);
		await queryInterface.sequelize.query(
			`CREATE INDEX IF NOT EXISTS "usergametags_game_tag_idx" ON "UserGameTags" ("gameId", "tag");`
		);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(
			`DROP TABLE IF EXISTS "UserGameTags";`
		);
	}
};
