"use strict";

module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			CREATE TABLE IF NOT EXISTS "MoodTagMetas" (
				"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				"userId" UUID NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
				"tag" VARCHAR(40) NOT NULL,
				"description" VARCHAR(255),
				"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
				"updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
			);
		`);

		await queryInterface.sequelize.query(
			`CREATE UNIQUE INDEX IF NOT EXISTS "moodtagmetas_user_tag_uniq" ON "MoodTagMetas" ("userId", "tag");`
		);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(
			`DROP TABLE IF EXISTS "MoodTagMetas";`
		);
	}
};
