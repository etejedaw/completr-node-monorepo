"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			ALTER TABLE "Users"
			ADD COLUMN IF NOT EXISTS "rewindIgnoresProfileVisibility" BOOLEAN NOT NULL DEFAULT false;
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			ALTER TABLE "Users" DROP COLUMN IF EXISTS "rewindIgnoresProfileVisibility";
		`);
	}
};
