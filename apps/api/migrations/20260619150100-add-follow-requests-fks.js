"use strict";

module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			DO $$ BEGIN
				IF NOT EXISTS (
					SELECT 1 FROM pg_constraint
					WHERE conrelid = '"UserFollowRequests"'::regclass
					  AND conname = 'UserFollowRequests_requesterId_fkey'
				) THEN
					ALTER TABLE "UserFollowRequests"
					ADD CONSTRAINT "UserFollowRequests_requesterId_fkey"
					FOREIGN KEY ("requesterId") REFERENCES "Users"(id) ON DELETE CASCADE;
				END IF;
			END $$;
		`);

		await queryInterface.sequelize.query(`
			DO $$ BEGIN
				IF NOT EXISTS (
					SELECT 1 FROM pg_constraint
					WHERE conrelid = '"UserFollowRequests"'::regclass
					  AND conname = 'UserFollowRequests_targetId_fkey'
				) THEN
					ALTER TABLE "UserFollowRequests"
					ADD CONSTRAINT "UserFollowRequests_targetId_fkey"
					FOREIGN KEY ("targetId") REFERENCES "Users"(id) ON DELETE CASCADE;
				END IF;
			END $$;
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			ALTER TABLE "UserFollowRequests"
			DROP CONSTRAINT IF EXISTS "UserFollowRequests_requesterId_fkey";
		`);
		await queryInterface.sequelize.query(`
			ALTER TABLE "UserFollowRequests"
			DROP CONSTRAINT IF EXISTS "UserFollowRequests_targetId_fkey";
		`);
	}
};
