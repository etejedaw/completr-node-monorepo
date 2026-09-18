"use strict";

module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(
			`ALTER TABLE "SavedFilters" ADD COLUMN IF NOT EXISTS "enabledStats" TEXT[] DEFAULT NULL;`
		);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(
			`ALTER TABLE "SavedFilters" DROP COLUMN IF EXISTS "enabledStats";`
		);
	}
};
