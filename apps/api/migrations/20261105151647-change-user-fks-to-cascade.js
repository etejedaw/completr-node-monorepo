"use strict";

const USER_FOREIGN_KEYS = [
	{ table: "Backlogs", column: "userId" },
	{ table: "Queues", column: "userId" },
	{ table: "GameShelves", column: "userId" },
	{ table: "Wishlists", column: "userId" },
	{ table: "Favorites", column: "userId" },
	{ table: "Lists", column: "userId" },
	{ table: "ListFollowers", column: "userId" },
	{ table: "SavedFilters", column: "userId" },
	{ table: "GameReports", column: "userId" },
	{ table: "Reviews", column: "userId" },
	{ table: "UserFollowers", column: "followerId" },
	{ table: "UserFollowers", column: "followingId" },
	{ table: "Activities", column: "userId" },
	{ table: "ActivityUsers", column: "targetUserId" }
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

function addUserForeignKey({ table, column }, onDelete) {
	return `
		ALTER TABLE "${table}"
		ADD CONSTRAINT "${table}_${column}_fkey"
		FOREIGN KEY ("${column}") REFERENCES "Users"(id) ON DELETE ${onDelete};
	`;
}

function replaceUserForeignKeys(onDelete) {
	return USER_FOREIGN_KEYS.map(
		foreignKey =>
			dropForeignKeysOnColumn(foreignKey) +
			addUserForeignKey(foreignKey, onDelete)
	).join("\n");
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.transaction(async transaction => {
			await queryInterface.sequelize.query(
				replaceUserForeignKeys("CASCADE"),
				{ transaction }
			);
		});
	},

	async down(queryInterface) {
		await queryInterface.sequelize.transaction(async transaction => {
			await queryInterface.sequelize.query(
				replaceUserForeignKeys("NO ACTION"),
				{ transaction }
			);
		});
	}
};
