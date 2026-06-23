"use strict";

const INDEXES = [
	{
		name: "backlogs_userid_status_finishedat_idx",
		columns: '"userId", "status", "finishedAt"'
	},
	{
		name: "backlogs_userid_ispublic_idx",
		columns: '"userId", "isPublic"'
	},
	{
		name: "backlogs_userid_gameid_idx",
		columns: '"userId", "gameId"'
	},
	{
		name: "backlogs_gameid_ispublic_idx",
		columns: '"gameId", "isPublic"'
	}
];

module.exports = {
	async up(queryInterface) {
		for (const { name, columns } of INDEXES) {
			await queryInterface.sequelize.query(
				`CREATE INDEX IF NOT EXISTS "${name}" ON "Backlogs" (${columns});`
			);
		}
	},

	async down(queryInterface) {
		for (const { name } of INDEXES) {
			await queryInterface.sequelize.query(
				`DROP INDEX IF EXISTS "${name}";`
			);
		}
	}
};
