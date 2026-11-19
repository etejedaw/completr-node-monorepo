"use strict";

module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			ALTER TABLE "MoodTagMetas"
			ADD COLUMN IF NOT EXISTS "icon" VARCHAR(50) DEFAULT NULL,
			ADD COLUMN IF NOT EXISTS "color" VARCHAR(20) DEFAULT NULL;
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			ALTER TABLE "MoodTagMetas"
			DROP COLUMN IF EXISTS "icon",
			DROP COLUMN IF EXISTS "color";
		`);
	}
};
