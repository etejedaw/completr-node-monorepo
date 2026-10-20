"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			CREATE TABLE IF NOT EXISTS "UserInvitations" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				email VARCHAR(255) NOT NULL,
				"tokenHash" VARCHAR(64) NOT NULL,
				"invitedById" UUID REFERENCES "Users"(id) ON DELETE SET NULL,
				"expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
				"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
				"updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
			);
			CREATE UNIQUE INDEX IF NOT EXISTS "UserInvitations_email_uidx"
			ON "UserInvitations"(email);
			CREATE UNIQUE INDEX IF NOT EXISTS "UserInvitations_tokenHash_uidx"
			ON "UserInvitations"("tokenHash");
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			DROP TABLE IF EXISTS "UserInvitations";
		`);
	}
};
