"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			ALTER TABLE "Rewinds"
			ADD COLUMN IF NOT EXISTS "includesNotes" BOOLEAN NOT NULL DEFAULT false;
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			ALTER TABLE "Rewinds" DROP COLUMN IF EXISTS "includesNotes";
		`);
	}
};
