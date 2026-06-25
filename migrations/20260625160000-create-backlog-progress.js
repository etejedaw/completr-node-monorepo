"use strict";

module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			DO $$
			BEGIN
				IF NOT EXISTS (
					SELECT 1 FROM pg_constraint
					WHERE conrelid = '"Backlogs"'::regclass AND contype = 'p'
				) THEN
					ALTER TABLE "Backlogs" ADD CONSTRAINT "Backlogs_pkey" PRIMARY KEY (id);
				END IF;
			END $$;
		`);

		await queryInterface.sequelize.query(`
			CREATE TABLE IF NOT EXISTS "BacklogProgresses" (
				"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				"backlogId" UUID NOT NULL REFERENCES "Backlogs"("id") ON DELETE CASCADE,
				"note" VARCHAR(500) NOT NULL,
				"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
			);
		`);

		await queryInterface.sequelize.query(
			`CREATE INDEX IF NOT EXISTS "backlogprogresses_backlog_created_idx" ON "BacklogProgresses" ("backlogId", "createdAt" DESC);`
		);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(
			`DROP TABLE IF EXISTS "BacklogProgresses";`
		);
	}
};
