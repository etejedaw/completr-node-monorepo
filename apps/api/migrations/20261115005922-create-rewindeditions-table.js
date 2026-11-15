"use strict";

module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			CREATE TABLE IF NOT EXISTS "RewindEditions" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				year INTEGER NOT NULL UNIQUE,
				"opensAt" DATE NOT NULL,
				"closesAt" DATE NOT NULL,
				"graceStartsAt" DATE NOT NULL,
				"graceEndsAt" DATE NOT NULL,
				design VARCHAR NOT NULL,
				"premiumRegenerations" INTEGER NOT NULL DEFAULT 0,
				"giftRegenerations" INTEGER NOT NULL DEFAULT 0,
				"frozenAt" TIMESTAMP WITH TIME ZONE,
				"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
				"updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
				CONSTRAINT "RewindEditions_period_valid" CHECK ("opensAt" <= "closesAt"),
				CONSTRAINT "RewindEditions_grace_valid" CHECK (
					"opensAt" <= "graceStartsAt"
					AND "graceStartsAt" <= "graceEndsAt"
					AND "graceEndsAt" <= "closesAt"
				),
				CONSTRAINT "RewindEditions_premiumRegenerations_valid" CHECK ("premiumRegenerations" >= 0),
				CONSTRAINT "RewindEditions_giftRegenerations_valid" CHECK ("giftRegenerations" >= 0)
			);

			INSERT INTO "RewindEditions" (
				year, "opensAt", "closesAt", "graceStartsAt", "graceEndsAt",
				design, "premiumRegenerations", "giftRegenerations"
			)
			VALUES (2026, '2026-12-01', '2027-01-31', '2027-01-01', '2027-01-07', '2026', 0, 0)
			ON CONFLICT (year) DO NOTHING;
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			DROP TABLE IF EXISTS "RewindEditions";
		`);
	}
};
