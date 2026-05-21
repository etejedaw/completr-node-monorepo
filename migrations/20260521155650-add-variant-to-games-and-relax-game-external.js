"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			ALTER TABLE "Games"
			ADD COLUMN IF NOT EXISTS "variant" VARCHAR(100);
		`);

		await queryInterface.sequelize.query(`
			DO $$
			DECLARE
				cname text;
			BEGIN
				SELECT con.conname INTO cname
				FROM pg_constraint con
				JOIN pg_class rel ON rel.oid = con.conrelid
				JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
				WHERE rel.relname = 'GameExternals'
					AND con.contype = 'u'
					AND nsp.nspname = current_schema()
					AND (
						SELECT array_agg(att.attname ORDER BY att.attname)
						FROM unnest(con.conkey) ck
						JOIN pg_attribute att
							ON att.attrelid = con.conrelid AND att.attnum = ck
					) = ARRAY['externalId','source']::name[];
				IF cname IS NOT NULL THEN
					EXECUTE format('ALTER TABLE "GameExternals" DROP CONSTRAINT %I', cname);
				END IF;
			END $$;
		`);

		await queryInterface.sequelize.query(`
			CREATE INDEX IF NOT EXISTS "game_externals_source_external_id_idx"
			ON "GameExternals" (source, "externalId");
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			DROP INDEX IF EXISTS "game_externals_source_external_id_idx";
		`);

		await queryInterface.sequelize.query(`
			ALTER TABLE "GameExternals"
			ADD CONSTRAINT "GameExternals_source_externalId_key"
			UNIQUE (source, "externalId");
		`);

		await queryInterface.sequelize.query(`
			ALTER TABLE "Games" DROP COLUMN IF EXISTS "variant";
		`);
	}
};
