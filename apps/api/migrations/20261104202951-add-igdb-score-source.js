"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			INSERT INTO "ScoreSources" (code, name, scale, priority, "createdAt", "updatedAt")
			VALUES ('igdb', 'IGDB', 100, 5, NOW(), NOW())
			ON CONFLICT (code) DO NOTHING;
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			UPDATE "Lists" SET "scoreSource" = 'completr' WHERE "scoreSource" = 'igdb';

			DELETE FROM "GameScores" WHERE source = 'igdb';

			DELETE FROM "ScoreSources" WHERE code = 'igdb';
		`);
	}
};
