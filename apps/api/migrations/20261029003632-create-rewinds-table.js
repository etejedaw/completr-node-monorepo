"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			DO $$ BEGIN
				CREATE TYPE "enum_Rewinds_language" AS ENUM ('en', 'es');
			EXCEPTION WHEN duplicate_object THEN null; END $$;

			DO $$ BEGIN
				CREATE TYPE "enum_Rewinds_aiRecapStatus" AS ENUM ('none', 'pending', 'ready', 'failed');
			EXCEPTION WHEN duplicate_object THEN null; END $$;

			CREATE TABLE IF NOT EXISTS "Rewinds" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				"userId" UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
				year INTEGER NOT NULL,
				language "enum_Rewinds_language" NOT NULL,
				"includesPrivateRuns" BOOLEAN NOT NULL DEFAULT false,
				"generatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
				"regenerationsUsed" INTEGER NOT NULL DEFAULT 0,
				"graceUsed" BOOLEAN NOT NULL DEFAULT false,
				"aiRecap" JSONB,
				"aiRecapStatus" "enum_Rewinds_aiRecapStatus" NOT NULL DEFAULT 'none',
				"aiRecapRequestedAt" TIMESTAMP WITH TIME ZONE,
				"premiumStats" JSONB,
				"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
				"updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
			);
			CREATE UNIQUE INDEX IF NOT EXISTS "Rewinds_userId_year_uidx"
			ON "Rewinds"("userId", year);
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			DROP TABLE IF EXISTS "Rewinds";
			DROP TYPE IF EXISTS "enum_Rewinds_aiRecapStatus";
			DROP TYPE IF EXISTS "enum_Rewinds_language";
		`);
	}
};
