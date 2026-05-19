"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			ALTER TABLE "RefreshTokens"
			ADD COLUMN IF NOT EXISTS "deviceInfo" TEXT,
			ADD COLUMN IF NOT EXISTS "lastUsedAt" TIMESTAMPTZ;
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			ALTER TABLE "RefreshTokens"
			DROP COLUMN IF EXISTS "deviceInfo",
			DROP COLUMN IF EXISTS "lastUsedAt";
		`);
	}
};
