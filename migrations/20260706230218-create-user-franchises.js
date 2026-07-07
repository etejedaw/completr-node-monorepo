"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			CREATE TABLE IF NOT EXISTS "UserFranchises" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				"userId" UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
				"franchiseId" UUID NOT NULL REFERENCES "Franchises"(id) ON DELETE CASCADE,
				"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
				"updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
			);

			CREATE UNIQUE INDEX IF NOT EXISTS "UserFranchises_userId_franchiseId_uidx"
			ON "UserFranchises"("userId", "franchiseId");
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			DROP TABLE IF EXISTS "UserFranchises";
		`);
	}
};
