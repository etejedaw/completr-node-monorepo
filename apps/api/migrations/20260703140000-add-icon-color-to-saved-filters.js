"use strict";

module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(
			`ALTER TABLE "SavedFilters" ADD COLUMN IF NOT EXISTS "icon" VARCHAR(50) DEFAULT NULL;`
		);
		await queryInterface.sequelize.query(
			`ALTER TABLE "SavedFilters" ADD COLUMN IF NOT EXISTS "color" VARCHAR(20) DEFAULT NULL;`
		);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(
			`ALTER TABLE "SavedFilters" DROP COLUMN IF EXISTS "icon";`
		);
		await queryInterface.sequelize.query(
			`ALTER TABLE "SavedFilters" DROP COLUMN IF EXISTS "color";`
		);
	}
};
