"use strict";

const PC_STORE_CODES = [
	"steam",
	"gog",
	"pc-epic-games",
	"ea-origin",
	"origin",
	"blizzard-battlenet"
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			INSERT INTO "Platforms" (
				id, name, code, abbreviation, manufacturer, description, "createdAt", "updatedAt"
			)
			SELECT
				gen_random_uuid(),
				'PC',
				'pc',
				'PC',
				'Generic',
				'Generic PC platform for games without a specific storefront',
				NOW(),
				NOW()
			WHERE NOT EXISTS (
				SELECT 1 FROM "Platforms" WHERE code = 'pc'
			);
		`);

		await queryInterface.sequelize.query(
			`
			INSERT INTO "GamePlatforms" ("gameId", "platformId")
			SELECT DISTINCT gp."gameId", pc.id
			FROM "GamePlatforms" gp
			JOIN "Platforms" store ON store.id = gp."platformId" AND store.code IN (:storeCodes)
			CROSS JOIN (SELECT id FROM "Platforms" WHERE code = 'pc' LIMIT 1) pc
			WHERE NOT EXISTS (
				SELECT 1 FROM "GamePlatforms" existing
				WHERE existing."gameId" = gp."gameId" AND existing."platformId" = pc.id
			);
			`,
			{ replacements: { storeCodes: PC_STORE_CODES } }
		);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			DELETE FROM "GamePlatforms"
			WHERE "platformId" IN (SELECT id FROM "Platforms" WHERE code = 'pc');
		`);
		await queryInterface.sequelize.query(`
			DELETE FROM "Platforms" WHERE code = 'pc';
		`);
	}
};
