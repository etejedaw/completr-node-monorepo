"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			CREATE TABLE IF NOT EXISTS "PasswordResetTokens" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				"userId" UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
				"tokenHash" VARCHAR(64) NOT NULL,
				"expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
				"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
				"updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
			);
			CREATE INDEX IF NOT EXISTS "PasswordResetTokens_userId_idx"
			ON "PasswordResetTokens"("userId");
			CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetTokens_tokenHash_uidx"
			ON "PasswordResetTokens"("tokenHash");
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			DROP TABLE IF EXISTS "PasswordResetTokens";
		`);
	}
};
