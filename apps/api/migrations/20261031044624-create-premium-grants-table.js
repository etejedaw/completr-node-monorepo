"use strict";

module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			CREATE TABLE IF NOT EXISTS "PremiumGrants" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				"userId" UUID REFERENCES "Users"(id) ON DELETE CASCADE,
				feature TEXT NOT NULL,
				"expiresAt" TIMESTAMP WITH TIME ZONE,
				"offerCode" TEXT,
				"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
				"updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
				CONSTRAINT "PremiumGrants_full_grant_valid" CHECK (
					feature <> '*' OR ("userId" IS NOT NULL AND "expiresAt" IS NOT NULL)
				),
				CONSTRAINT "PremiumGrants_global_offer_valid" CHECK (
					"userId" IS NOT NULL OR "offerCode" IS NULL
				)
			);

			CREATE UNIQUE INDEX IF NOT EXISTS "PremiumGrants_userId_offerCode_unique"
			ON "PremiumGrants" ("userId", "offerCode")
			WHERE "offerCode" IS NOT NULL AND "userId" IS NOT NULL;

			INSERT INTO "PremiumGrants" ("userId", feature, "expiresAt", "offerCode")
			SELECT NULL, 'rewind.premium', '2027-01-31T23:59:59.999Z', NULL
			WHERE NOT EXISTS (
				SELECT 1 FROM "PremiumGrants"
				WHERE "userId" IS NULL
				AND feature = 'rewind.premium'
				AND "expiresAt" = '2027-01-31T23:59:59.999Z'
			);
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			DELETE FROM "PremiumGrants"
			WHERE "userId" IS NULL
			AND feature = 'rewind.premium'
			AND "expiresAt" = '2027-01-31T23:59:59.999Z';

			DROP TABLE IF EXISTS "PremiumGrants";
		`);
	}
};
