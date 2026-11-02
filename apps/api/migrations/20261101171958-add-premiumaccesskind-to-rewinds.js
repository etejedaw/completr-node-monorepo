"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			DO $$ BEGIN
				CREATE TYPE "enum_Rewinds_premiumAccessKind" AS ENUM ('premium', 'gift');
			EXCEPTION WHEN duplicate_object THEN null; END $$;

			ALTER TABLE "Rewinds"
			ADD COLUMN IF NOT EXISTS "premiumAccessKind" "enum_Rewinds_premiumAccessKind";
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			ALTER TABLE "Rewinds" DROP COLUMN IF EXISTS "premiumAccessKind";
			DROP TYPE IF EXISTS "enum_Rewinds_premiumAccessKind";
		`);
	}
};
