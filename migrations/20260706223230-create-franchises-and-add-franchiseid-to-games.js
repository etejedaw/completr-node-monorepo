"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			CREATE TABLE IF NOT EXISTS "Franchises" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				name VARCHAR(100) NOT NULL UNIQUE,
				code VARCHAR(100) NOT NULL UNIQUE,
				description TEXT,
				"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
				"updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
			);

			ALTER TABLE "Games"
			ADD COLUMN IF NOT EXISTS "franchiseId" UUID
			REFERENCES "Franchises"(id) ON DELETE SET NULL;

			CREATE INDEX IF NOT EXISTS "Games_franchiseId_idx"
			ON "Games"("franchiseId");
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			DROP INDEX IF EXISTS "Games_franchiseId_idx";
			ALTER TABLE "Games" DROP COLUMN IF EXISTS "franchiseId";
			DROP TABLE IF EXISTS "Franchises";
		`);
	}
};
