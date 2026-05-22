"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			ALTER TABLE "Users"
			ADD COLUMN IF NOT EXISTS "isBacklogPublic" BOOLEAN DEFAULT true,
			ADD COLUMN IF NOT EXISTS "isShelfPublic" BOOLEAN DEFAULT true,
			ADD COLUMN IF NOT EXISTS "isListPublic" BOOLEAN DEFAULT true;
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			ALTER TABLE "Users"
			DROP COLUMN IF EXISTS "isBacklogPublic",
			DROP COLUMN IF EXISTS "isShelfPublic",
			DROP COLUMN IF EXISTS "isListPublic";
		`);
	}
};
