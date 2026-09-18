"use strict";

module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(
			`WITH best AS (
			   SELECT DISTINCT ON (a.id)
			     a.id AS activity_id,
			     g.id AS game_id,
			     g.title AS title,
			     g.code AS code,
			     g."backgroundUrl" AS background_url,
			     ABS(EXTRACT(EPOCH FROM (bt."createdAt" - a."createdAt"))) AS delta
			   FROM "Activities" a
			   JOIN "ActivityUsers" au ON au."activityId" = a.id
			   JOIN "Backlogs" bt ON bt."userId" = au."targetUserId"
			   JOIN "CoopRuns" cr ON cr.id = bt."coopRunId"
			   JOIN "Games" g ON g.id = cr."gameId"
			   WHERE a.type = 'coop_tagged'
			     AND EXISTS (
			       SELECT 1 FROM "Backlogs" ba
			       WHERE ba."coopRunId" = cr.id AND ba."userId" = a."userId"
			     )
			   ORDER BY a.id, ABS(EXTRACT(EPOCH FROM (bt."createdAt" - a."createdAt"))) ASC
			 )
			 UPDATE "Activities" act
			 SET metadata = jsonb_build_object(
			   'game',
			   jsonb_build_object(
			     'id', best.game_id,
			     'title', best.title,
			     'code', best.code,
			     'backgroundUrl', best.background_url
			   )
			 )
			 FROM best
			 WHERE act.id = best.activity_id
			   AND act.metadata IS NULL
			   AND best.delta <= 5;`
		);
	},

	async down() {}
};
