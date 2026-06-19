"use strict";

const SUBGENRES = [
	{ code: "point-and-click", name: "Point and Click" },
	{ code: "roguelike", name: "Roguelike" },
	{ code: "roguelite", name: "Roguelite" },
	{ code: "metroidvania", name: "Metroidvania" },
	{ code: "soulslike", name: "Soulslike" },
	{ code: "visual-novel", name: "Visual Novel" },
	{ code: "deck-building", name: "Deck Building" },
	{ code: "battle-royale", name: "Battle Royale" },
	{ code: "survival-horror", name: "Survival Horror" },
	{ code: "dungeon-crawler", name: "Dungeon Crawler" },
	{ code: "auto-battler", name: "Auto Battler" }
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		for (const { code, name } of SUBGENRES) {
			await queryInterface.sequelize.query(
				`
				INSERT INTO "Genres" (id, name, code, "createdAt", "updatedAt")
				SELECT gen_random_uuid(), :name, :code, NOW(), NOW()
				WHERE NOT EXISTS (
					SELECT 1 FROM "Genres" WHERE code = :code
				);
				`,
				{ replacements: { code, name } }
			);
		}
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(
			`
			DELETE FROM "GameGenres"
			WHERE "genreId" IN (SELECT id FROM "Genres" WHERE code IN (:codes));
			`,
			{ replacements: { codes: SUBGENRES.map(s => s.code) } }
		);
		await queryInterface.sequelize.query(
			`DELETE FROM "Genres" WHERE code IN (:codes);`,
			{ replacements: { codes: SUBGENRES.map(s => s.code) } }
		);
	}
};
