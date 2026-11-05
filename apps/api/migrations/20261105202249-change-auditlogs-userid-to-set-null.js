"use strict";

function replaceAuditLogUserForeignKey(onDelete) {
	return `
		DO $$
		DECLARE constraint_name text;
		BEGIN
			FOR constraint_name IN
				SELECT c.conname
				FROM pg_constraint c
				JOIN pg_attribute a
					ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
				WHERE c.conrelid = '"AuditLogs"'::regclass
				AND c.contype = 'f'
				AND a.attname = 'userId'
			LOOP
				EXECUTE format('ALTER TABLE "AuditLogs" DROP CONSTRAINT %I', constraint_name);
			END LOOP;
		END $$;

		ALTER TABLE "AuditLogs"
		ADD CONSTRAINT "AuditLogs_userId_fkey"
		FOREIGN KEY ("userId") REFERENCES "Users"(id) ON DELETE ${onDelete};
	`;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.transaction(async transaction => {
			await queryInterface.sequelize.query(
				`
					ALTER TABLE "AuditLogs" ALTER COLUMN "userId" DROP NOT NULL;
					${replaceAuditLogUserForeignKey("SET NULL")}
				`,
				{ transaction }
			);
		});
	},

	async down(queryInterface) {
		await queryInterface.sequelize.transaction(async transaction => {
			await queryInterface.sequelize.query(
				`
					${replaceAuditLogUserForeignKey("NO ACTION")}
					DO $$ BEGIN
						IF NOT EXISTS (SELECT 1 FROM "AuditLogs" WHERE "userId" IS NULL) THEN
							ALTER TABLE "AuditLogs" ALTER COLUMN "userId" SET NOT NULL;
						END IF;
					END $$;
				`,
				{ transaction }
			);
		});
	}
};
