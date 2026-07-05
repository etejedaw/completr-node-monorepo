"use strict";

module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(
			`ALTER TABLE "Activities" ADD COLUMN IF NOT EXISTS "metadata" JSONB;`
		);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(
			`ALTER TABLE "Activities" DROP COLUMN IF EXISTS "metadata";`
		);
	}
};
