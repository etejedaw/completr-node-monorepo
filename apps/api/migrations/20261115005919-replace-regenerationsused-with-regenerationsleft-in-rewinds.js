"use strict";

module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			ALTER TABLE "Rewinds"
			ADD COLUMN IF NOT EXISTS "regenerationsLeft" INTEGER NOT NULL DEFAULT 0
			CONSTRAINT "Rewinds_regenerationsLeft_valid" CHECK ("regenerationsLeft" >= 0);

			ALTER TABLE "Rewinds" DROP COLUMN IF EXISTS "regenerationsUsed";
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			ALTER TABLE "Rewinds"
			ADD COLUMN IF NOT EXISTS "regenerationsUsed" INTEGER NOT NULL DEFAULT 0;

			ALTER TABLE "Rewinds" DROP COLUMN IF EXISTS "regenerationsLeft";
		`);
	}
};
