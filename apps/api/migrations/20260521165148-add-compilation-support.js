"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			DO $$
			BEGIN
				IF NOT EXISTS (
					SELECT 1 FROM pg_constraint
					WHERE conrelid = '"Games"'::regclass AND contype = 'p'
				) THEN
					ALTER TABLE "Games" ADD PRIMARY KEY (id);
				END IF;
			END $$;
		`);

		await queryInterface.sequelize.query(`
			ALTER TABLE "Games"
			ADD COLUMN IF NOT EXISTS "isCompilation" BOOLEAN NOT NULL DEFAULT false;
		`);

		await queryInterface.sequelize.query(`
			DROP TABLE IF EXISTS "CompilationItems";
		`);

		await queryInterface.sequelize.query(`
			CREATE TABLE "CompilationItems" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				"parentGameId" UUID NOT NULL REFERENCES "Games"(id) ON DELETE CASCADE,
				"childGameId" UUID NOT NULL REFERENCES "Games"(id) ON DELETE CASCADE,
				"position" INTEGER NOT NULL DEFAULT 0,
				"createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
				"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
				UNIQUE ("parentGameId", "childGameId")
			);
		`);

		await queryInterface.sequelize.query(`
			CREATE INDEX IF NOT EXISTS "compilation_items_parent_idx"
			ON "CompilationItems" ("parentGameId", "position");
		`);

		await queryInterface.sequelize.query(`
			CREATE INDEX IF NOT EXISTS "compilation_items_child_idx"
			ON "CompilationItems" ("childGameId");
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			DROP TABLE IF EXISTS "CompilationItems";
		`);
		await queryInterface.sequelize.query(`
			ALTER TABLE "Games" DROP COLUMN IF EXISTS "isCompilation";
		`);
	}
};
