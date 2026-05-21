"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			CREATE TABLE IF NOT EXISTS "Wishlists" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				"userId" UUID NOT NULL,
				"gameId" UUID NOT NULL,
				position INTEGER NOT NULL,
				"createdAt" TIMESTAMPTZ NOT NULL,
				"updatedAt" TIMESTAMPTZ NOT NULL,
				UNIQUE ("userId", "gameId")
			);

			ALTER TABLE "Users"
			ADD COLUMN IF NOT EXISTS "isWishlistPublic" BOOLEAN DEFAULT true;
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			ALTER TABLE "Users" DROP COLUMN IF EXISTS "isWishlistPublic";
			DROP TABLE IF EXISTS "Wishlists";
		`);
	}
};
