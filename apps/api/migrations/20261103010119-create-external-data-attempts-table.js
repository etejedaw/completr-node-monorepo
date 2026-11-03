"use strict";

module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			DO $$ BEGIN
				CREATE TYPE "enum_ExternalDataAttempts_source" AS ENUM ('metacritic', 'hltb');
			EXCEPTION WHEN duplicate_object THEN null; END $$;

			DO $$ BEGIN
				CREATE TYPE "enum_ExternalDataAttempts_status" AS ENUM ('not_found', 'ambiguous', 'no_data', 'failed');
			EXCEPTION WHEN duplicate_object THEN null; END $$;

			CREATE TABLE IF NOT EXISTS "ExternalDataAttempts" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				"gameId" UUID NOT NULL REFERENCES "Games"(id) ON DELETE CASCADE,
				source "enum_ExternalDataAttempts_source" NOT NULL,
				status "enum_ExternalDataAttempts_status" NOT NULL,
				"attemptedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
				"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
				"updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
				UNIQUE ("gameId", source)
			);
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			DROP TABLE IF EXISTS "ExternalDataAttempts";
			DROP TYPE IF EXISTS "enum_ExternalDataAttempts_status";
			DROP TYPE IF EXISTS "enum_ExternalDataAttempts_source";
		`);
	}
};
