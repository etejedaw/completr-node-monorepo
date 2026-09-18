"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			ALTER TYPE "enum_Backlogs_status" ADD VALUE IF NOT EXISTS 'endless';
		`);
	},

	async down() {
		// PostgreSQL does not support removing enum values without recreating
		// the type. Leaving the value in place is harmless if no rows use it.
	}
};
