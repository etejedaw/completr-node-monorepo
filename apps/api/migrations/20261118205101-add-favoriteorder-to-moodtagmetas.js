"use strict";

module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			ALTER TABLE "MoodTagMetas"
			ADD COLUMN IF NOT EXISTS "favoriteOrder" INTEGER;
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			ALTER TABLE "MoodTagMetas" DROP COLUMN IF EXISTS "favoriteOrder";
		`);
	}
};
