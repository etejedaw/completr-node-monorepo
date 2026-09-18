"use strict";

const SECTIONS = [
	{ enumCol: "profileVisibility", oldCol: "isPublic" },
	{ enumCol: "queueVisibility", oldCol: "isQueuePublic" },
	{ enumCol: "wishlistVisibility", oldCol: "isWishlistPublic" },
	{ enumCol: "favoriteVisibility", oldCol: "isFavoritePublic" },
	{ enumCol: "feedVisibility", oldCol: "isFeedPublic" },
	{ enumCol: "backlogVisibility", oldCol: "isBacklogPublic" },
	{ enumCol: "shelfVisibility", oldCol: "isShelfPublic" },
	{ enumCol: "listVisibility", oldCol: "isListPublic" }
];

module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			DO $$ BEGIN
				CREATE TYPE "enum_Users_visibility" AS ENUM ('private', 'friends', 'public');
			EXCEPTION WHEN duplicate_object THEN null; END $$;
		`);

		for (const { enumCol, oldCol } of SECTIONS) {
			await queryInterface.sequelize.query(`
				ALTER TABLE "Users"
				ADD COLUMN IF NOT EXISTS "${enumCol}" "enum_Users_visibility"
				NOT NULL DEFAULT 'public';
			`);

			await queryInterface.sequelize.query(`
				UPDATE "Users"
				SET "${enumCol}" = CASE WHEN "${oldCol}" THEN 'public'::"enum_Users_visibility"
				                        ELSE 'private'::"enum_Users_visibility" END
				WHERE "${oldCol}" IS NOT NULL;
			`);

			await queryInterface.sequelize.query(`
				ALTER TABLE "Users" DROP COLUMN IF EXISTS "${oldCol}";
			`);
		}
	},

	async down(queryInterface) {
		for (const { enumCol, oldCol } of SECTIONS) {
			await queryInterface.sequelize.query(`
				ALTER TABLE "Users"
				ADD COLUMN IF NOT EXISTS "${oldCol}" BOOLEAN DEFAULT TRUE;
			`);

			await queryInterface.sequelize.query(`
				UPDATE "Users"
				SET "${oldCol}" = CASE WHEN "${enumCol}" = 'private' THEN FALSE
				                       ELSE TRUE END;
			`);

			await queryInterface.sequelize.query(`
				ALTER TABLE "Users" DROP COLUMN IF EXISTS "${enumCol}";
			`);
		}

		await queryInterface.sequelize.query(
			`DROP TYPE IF EXISTS "enum_Users_visibility";`
		);
	}
};
