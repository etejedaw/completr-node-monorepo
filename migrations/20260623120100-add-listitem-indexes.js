"use strict";

module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(
			`CREATE UNIQUE INDEX IF NOT EXISTS "listitems_listid_gameid_unique_idx" ON "ListItems" ("listId", "gameId");`
		);

		await queryInterface.sequelize.query(
			`CREATE INDEX IF NOT EXISTS "listitems_listid_position_idx" ON "ListItems" ("listId", "position");`
		);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(
			`DROP INDEX IF EXISTS "listitems_listid_position_idx";`
		);
		await queryInterface.sequelize.query(
			`DROP INDEX IF EXISTS "listitems_listid_gameid_unique_idx";`
		);
	}
};
