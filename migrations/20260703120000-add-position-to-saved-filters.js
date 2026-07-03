"use strict";

module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(
			`ALTER TABLE "SavedFilters" ADD COLUMN IF NOT EXISTS "position" INTEGER NOT NULL DEFAULT 0;`
		);
		await queryInterface.sequelize.query(
			`UPDATE "SavedFilters" AS sf
			 SET "position" = sub.rn
			 FROM (
				SELECT "id", ROW_NUMBER() OVER (
					PARTITION BY "userId" ORDER BY "createdAt" ASC
				) AS rn
				FROM "SavedFilters"
			 ) AS sub
			 WHERE sf."id" = sub."id";`
		);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(
			`ALTER TABLE "SavedFilters" DROP COLUMN IF EXISTS "position";`
		);
	}
};
