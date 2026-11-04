"use strict";

module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			ALTER TYPE "enum_ExternalDataAttempts_source" ADD VALUE IF NOT EXISTS 'igdb';
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			DO $$ BEGIN
				IF EXISTS (
					SELECT 1
					FROM pg_enum
					JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
					WHERE pg_type.typname = 'enum_ExternalDataAttempts_source'
						AND pg_enum.enumlabel = 'igdb'
				) THEN
					DELETE FROM "ExternalDataAttempts" WHERE source = 'igdb';
					ALTER TYPE "enum_ExternalDataAttempts_source" RENAME TO "enum_ExternalDataAttempts_source_old";
					CREATE TYPE "enum_ExternalDataAttempts_source" AS ENUM ('metacritic', 'hltb');
					ALTER TABLE "ExternalDataAttempts"
						ALTER COLUMN source TYPE "enum_ExternalDataAttempts_source"
						USING source::text::"enum_ExternalDataAttempts_source";
					DROP TYPE "enum_ExternalDataAttempts_source_old";
				END IF;
			END $$;
		`);
	}
};
