"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			DO $$ BEGIN
				IF NOT EXISTS (
					SELECT 1 FROM information_schema.columns
					WHERE table_name = 'Users' AND column_name = 'franchiseVisibility'
				) THEN
					ALTER TABLE "Users"
					ADD COLUMN "franchiseVisibility" "enum_Users_visibility"
					NOT NULL DEFAULT 'public';

					UPDATE "Users" SET "franchiseVisibility" = "backlogVisibility";
				END IF;
			END $$;
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			ALTER TABLE "Users" DROP COLUMN IF EXISTS "franchiseVisibility";
		`);
	}
};
