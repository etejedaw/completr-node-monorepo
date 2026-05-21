"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			ALTER TABLE "Wishlists"
			ADD COLUMN IF NOT EXISTS "platformId" UUID;
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			ALTER TABLE "Wishlists" DROP COLUMN IF EXISTS "platformId";
		`);
	}
};
