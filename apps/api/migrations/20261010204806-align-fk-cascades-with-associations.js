"use strict";

const CASCADE_FOREIGN_KEYS = [
	{ table: "ActivityLists", column: "listId", references: "Lists" },
	{ table: "Queues", column: "backlogId", references: "Backlogs" },
	{ table: "RefreshTokens", column: "userId", references: "Users" },
	{ table: "GamePlatforms", column: "gameId", references: "Games" },
	{ table: "GameGenres", column: "gameId", references: "Games" },
	{ table: "GameShelves", column: "gameId", references: "Games" },
	{ table: "ListItems", column: "gameId", references: "Games" },
	{ table: "Backlogs", column: "gameId", references: "Games" },
	{ table: "GameScores", column: "gameId", references: "Games" },
	{ table: "GameTimes", column: "gameId", references: "Games" },
	{ table: "Favorites", column: "gameId", references: "Games" },
	{ table: "GameExternals", column: "gameId", references: "Games" },
	{ table: "GameReports", column: "gameId", references: "Games" },
	{ table: "ActivityGames", column: "gameId", references: "Games" }
];

const WISHLIST_FOREIGN_KEYS = [
	{ table: "Wishlists", column: "userId", references: "Users" },
	{
		table: "Wishlists",
		column: "gameId",
		references: "Games",
		cascade: true
	},
	{ table: "Wishlists", column: "platformId", references: "Platforms" }
];

function dropForeignKeysOnColumn({ table, column }) {
	return `
		DO $$
		DECLARE constraint_name text;
		BEGIN
			FOR constraint_name IN
				SELECT c.conname
				FROM pg_constraint c
				JOIN pg_attribute a
					ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
				WHERE c.conrelid = '"${table}"'::regclass
				AND c.contype = 'f'
				AND a.attname = '${column}'
			LOOP
				EXECUTE format('ALTER TABLE "${table}" DROP CONSTRAINT %I', constraint_name);
			END LOOP;
		END $$;
	`;
}

function addForeignKey({ table, column, references }, cascade) {
	const onDelete = cascade ? " ON DELETE CASCADE" : "";
	return `
		ALTER TABLE "${table}"
		ADD CONSTRAINT "${table}_${column}_fkey"
		FOREIGN KEY ("${column}") REFERENCES "${references}"(id)${onDelete};
	`;
}

function replaceForeignKey(foreignKey, cascade) {
	return (
		dropForeignKeysOnColumn(foreignKey) + addForeignKey(foreignKey, cascade)
	);
}

const DELETE_ORPHAN_WISHLISTS = `
	DELETE FROM "Wishlists" w
	WHERE NOT EXISTS (SELECT 1 FROM "Users" u WHERE u.id = w."userId")
	OR NOT EXISTS (SELECT 1 FROM "Games" g WHERE g.id = w."gameId");

	UPDATE "Wishlists" w
	SET "platformId" = NULL
	WHERE w."platformId" IS NOT NULL
	AND NOT EXISTS (SELECT 1 FROM "Platforms" p WHERE p.id = w."platformId");
`;

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.transaction(async transaction => {
			const cascades = CASCADE_FOREIGN_KEYS.map(foreignKey =>
				replaceForeignKey(foreignKey, true)
			);
			const wishlistForeignKeys = WISHLIST_FOREIGN_KEYS.map(foreignKey =>
				replaceForeignKey(foreignKey, foreignKey.cascade)
			);

			await queryInterface.sequelize.query(
				[
					...cascades,
					DELETE_ORPHAN_WISHLISTS,
					...wishlistForeignKeys
				].join("\n"),
				{ transaction }
			);
		});
	},

	async down(queryInterface) {
		await queryInterface.sequelize.transaction(async transaction => {
			const withoutCascades = CASCADE_FOREIGN_KEYS.map(foreignKey =>
				replaceForeignKey(foreignKey, false)
			);
			const droppedWishlistForeignKeys = WISHLIST_FOREIGN_KEYS.map(
				dropForeignKeysOnColumn
			);

			await queryInterface.sequelize.query(
				[...withoutCascades, ...droppedWishlistForeignKeys].join("\n"),
				{ transaction }
			);
		});
	}
};
