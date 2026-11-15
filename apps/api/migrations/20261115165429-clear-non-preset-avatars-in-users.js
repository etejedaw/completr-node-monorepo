"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			UPDATE "Users"
			SET "avatarUrl" = NULL
			WHERE "avatarUrl" IS NOT NULL
			-- Accepts /avatars/completr_profile_01.png through /avatars/completr_profile_15.png
			AND "avatarUrl" !~ '^/avatars/completr_profile_(0[1-9]|1[0-5])\\.png$';
		`);
	},

	async down() {}
};
