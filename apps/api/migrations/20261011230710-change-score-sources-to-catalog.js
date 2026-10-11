"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			ALTER TABLE "ScoreSources"
			ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 100;

			INSERT INTO "ScoreSources" (code, name, scale, priority, "createdAt", "updatedAt")
			VALUES
				('completr', 'Completr', 5, 1, NOW(), NOW()),
				('metacritic', 'Metacritic', 100, 2, NOW(), NOW()),
				('opencritic', 'OpenCritic', 100, 3, NOW(), NOW()),
				('rawg', 'RAWG', 5, 4, NOW(), NOW())
			ON CONFLICT (code) DO NOTHING;

			UPDATE "ScoreSources" SET priority = CASE code
				WHEN 'completr' THEN 1
				WHEN 'metacritic' THEN 2
				WHEN 'opencritic' THEN 3
				WHEN 'rawg' THEN 4
			END
			WHERE code IN ('completr', 'metacritic', 'opencritic', 'rawg')
				AND priority = 100;

			ALTER TABLE "Lists"
			ALTER COLUMN "scoreSource" TYPE VARCHAR(50) USING "scoreSource"::text;

			DROP TYPE IF EXISTS "enum_Lists_scoreSource";

			DO $$
			DECLARE
				orphan_sources TEXT;
			BEGIN
				SELECT string_agg(DISTINCT source, ', ') INTO orphan_sources
				FROM (
					SELECT source FROM "GameScores"
					UNION
					SELECT "scoreSource" AS source FROM "Lists"
				) used
				WHERE source NOT IN (SELECT code FROM "ScoreSources");

				IF orphan_sources IS NOT NULL THEN
					RAISE EXCEPTION 'Score sources used by GameScores or Lists are missing from ScoreSources: %. Create them in the catalog and rerun the migration.', orphan_sources;
				END IF;
			END $$;

			ALTER TABLE "GameScores" DROP CONSTRAINT IF EXISTS "GameScores_source_fkey";
			ALTER TABLE "GameScores"
			ADD CONSTRAINT "GameScores_source_fkey"
			FOREIGN KEY (source) REFERENCES "ScoreSources"(code)
			ON UPDATE CASCADE ON DELETE RESTRICT;

			ALTER TABLE "Lists" DROP CONSTRAINT IF EXISTS "Lists_scoreSource_fkey";
			ALTER TABLE "Lists"
			ADD CONSTRAINT "Lists_scoreSource_fkey"
			FOREIGN KEY ("scoreSource") REFERENCES "ScoreSources"(code)
			ON UPDATE CASCADE ON DELETE RESTRICT;
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			ALTER TABLE "Lists" DROP CONSTRAINT IF EXISTS "Lists_scoreSource_fkey";

			ALTER TABLE "GameScores" DROP CONSTRAINT IF EXISTS "GameScores_source_fkey";
			ALTER TABLE "GameScores"
			ADD CONSTRAINT "GameScores_source_fkey"
			FOREIGN KEY (source) REFERENCES "ScoreSources"(code)
			ON UPDATE CASCADE ON DELETE CASCADE;

			DO $$ BEGIN
				CREATE TYPE "enum_Lists_scoreSource" AS ENUM ('metacritic', 'opencritic', 'rawg', 'completr');
			EXCEPTION WHEN duplicate_object THEN null;
			END $$;

			ALTER TABLE "Lists"
			ALTER COLUMN "scoreSource" TYPE "enum_Lists_scoreSource"
			USING "scoreSource"::"enum_Lists_scoreSource";

			ALTER TABLE "ScoreSources" DROP COLUMN IF EXISTS priority;
		`);
	}
};
