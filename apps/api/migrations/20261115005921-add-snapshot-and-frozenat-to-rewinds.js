"use strict";

module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			ALTER TABLE "Rewinds"
			ADD COLUMN IF NOT EXISTS snapshot JSONB,
			ADD COLUMN IF NOT EXISTS "frozenAt" TIMESTAMP WITH TIME ZONE;
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			ALTER TABLE "Rewinds"
			DROP COLUMN IF EXISTS "frozenAt",
			DROP COLUMN IF EXISTS snapshot;
		`);
	}
};
