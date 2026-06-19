"use strict";

module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			ALTER TABLE "Users"
			ADD COLUMN IF NOT EXISTS "acceptFollowRequests" BOOLEAN NOT NULL DEFAULT TRUE;
		`);

		await queryInterface.sequelize.query(`
			CREATE TABLE IF NOT EXISTS "UserFollowRequests" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				"requesterId" UUID NOT NULL,
				"targetId" UUID NOT NULL,
				"createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
				"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
				CONSTRAINT "UserFollowRequests_requester_target_unique" UNIQUE ("requesterId", "targetId")
			);
		`);

		await queryInterface.sequelize.query(`
			CREATE INDEX IF NOT EXISTS "UserFollowRequests_targetId_createdAt_idx"
			ON "UserFollowRequests" ("targetId", "createdAt" DESC);
		`);

		await queryInterface.sequelize.query(`
			CREATE INDEX IF NOT EXISTS "UserFollowRequests_requesterId_idx"
			ON "UserFollowRequests" ("requesterId");
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(
			`DROP TABLE IF EXISTS "UserFollowRequests";`
		);
		await queryInterface.sequelize.query(`
			ALTER TABLE "Users" DROP COLUMN IF EXISTS "acceptFollowRequests";
		`);
	}
};
