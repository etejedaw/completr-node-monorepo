"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			ALTER TABLE "Users"
			ADD COLUMN IF NOT EXISTS "theme" VARCHAR(50) DEFAULT 'refined-dark';
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			ALTER TABLE "Users" DROP COLUMN IF EXISTS "theme";
		`);
	}
};
