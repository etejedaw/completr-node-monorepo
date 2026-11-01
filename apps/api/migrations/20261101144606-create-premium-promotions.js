"use strict";

module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			CREATE TABLE IF NOT EXISTS "PremiumPromotions" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				code VARCHAR(80) NOT NULL UNIQUE,
				feature TEXT NOT NULL,
				"startsAt" TIMESTAMP WITH TIME ZONE NOT NULL,
				"endsAt" TIMESTAMP WITH TIME ZONE NOT NULL,
				"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
				"updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
				CONSTRAINT "PremiumPromotions_dates_valid" CHECK ("endsAt" >= "startsAt")
			);
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			DROP TABLE IF EXISTS "PremiumPromotions";
		`);
	}
};
