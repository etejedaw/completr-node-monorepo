"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			DO $$ BEGIN
				CREATE TYPE "enum_DataRequests_type" AS ENUM ('export', 'deletion');
			EXCEPTION WHEN duplicate_object THEN null; END $$;

			DO $$ BEGIN
				CREATE TYPE "enum_DataRequests_status" AS ENUM ('pending', 'completed', 'rejected');
			EXCEPTION WHEN duplicate_object THEN null; END $$;

			CREATE TABLE IF NOT EXISTS "DataRequests" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				"userId" UUID REFERENCES "Users"(id) ON DELETE SET NULL,
				type "enum_DataRequests_type" NOT NULL,
				status "enum_DataRequests_status" NOT NULL DEFAULT 'pending',
				"resolutionNote" TEXT,
				"requestedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
				"resolvedAt" TIMESTAMP WITH TIME ZONE,
				"resolvedById" UUID REFERENCES "Users"(id) ON DELETE SET NULL,
				"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
				"updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
			);

			CREATE INDEX IF NOT EXISTS "DataRequests_userId_type_status_idx"
			ON "DataRequests" ("userId", type, status);

			CREATE UNIQUE INDEX IF NOT EXISTS "DataRequests_userId_type_pending_uidx"
			ON "DataRequests" ("userId", type)
			WHERE status = 'pending';

			CREATE INDEX IF NOT EXISTS "DataRequests_status_requestedAt_idx"
			ON "DataRequests" (status, "requestedAt");
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			DROP TABLE IF EXISTS "DataRequests";
			DROP TYPE IF EXISTS "enum_DataRequests_status";
			DROP TYPE IF EXISTS "enum_DataRequests_type";
		`);
	}
};
