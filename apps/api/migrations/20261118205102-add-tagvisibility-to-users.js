"use strict";

module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			DO $$ BEGIN
				IF NOT EXISTS (
					SELECT 1 FROM information_schema.columns
					WHERE table_name = 'Users' AND column_name = 'tagVisibility'
				) THEN
					ALTER TABLE "Users"
					ADD COLUMN "tagVisibility" "enum_Users_visibility"
					NOT NULL DEFAULT 'public';

					UPDATE "Users" SET "tagVisibility" = "backlogVisibility";
				END IF;
			END $$;
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			ALTER TABLE "Users" DROP COLUMN IF EXISTS "tagVisibility";
		`);
	}
};
