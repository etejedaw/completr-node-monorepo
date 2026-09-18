"use strict";

module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			ALTER TABLE "Users" ALTER COLUMN id SET DEFAULT gen_random_uuid();
		`);

		await queryInterface.sequelize.query(`
			DO $$ BEGIN
				IF NOT EXISTS (
					SELECT 1 FROM pg_constraint
					WHERE conrelid = '"Users"'::regclass AND contype = 'p'
				) THEN
					ALTER TABLE "Users" ADD CONSTRAINT "Users_pkey" PRIMARY KEY (id);
				END IF;
			END $$;
		`);

		await queryInterface.sequelize.query(`
			ALTER TABLE "Users" ALTER COLUMN username SET NOT NULL;
		`);
		await queryInterface.sequelize.query(`
			ALTER TABLE "Users" ALTER COLUMN email SET NOT NULL;
		`);
		await queryInterface.sequelize.query(`
			ALTER TABLE "Users" ALTER COLUMN password SET NOT NULL;
		`);

		await queryInterface.sequelize.query(`
			DO $$ BEGIN
				IF NOT EXISTS (
					SELECT 1 FROM pg_constraint
					WHERE conrelid = '"Users"'::regclass
					  AND contype = 'u'
					  AND conname = 'Users_username_key'
				) THEN
					ALTER TABLE "Users" ADD CONSTRAINT "Users_username_key" UNIQUE (username);
				END IF;
			END $$;
		`);

		await queryInterface.sequelize.query(`
			DO $$ BEGIN
				IF NOT EXISTS (
					SELECT 1 FROM pg_constraint
					WHERE conrelid = '"Users"'::regclass
					  AND contype = 'u'
					  AND conname = 'Users_email_key'
				) THEN
					ALTER TABLE "Users" ADD CONSTRAINT "Users_email_key" UNIQUE (email);
				END IF;
			END $$;
		`);

		await queryInterface.sequelize.query(`
			ALTER TABLE "Users" ALTER COLUMN "isPublic" SET DEFAULT true;
		`);
		await queryInterface.sequelize.query(`
			ALTER TABLE "Users" ALTER COLUMN "isWishlistPublic" SET DEFAULT true;
		`);
		await queryInterface.sequelize.query(`
			ALTER TABLE "Users" ALTER COLUMN "isFavoritePublic" SET DEFAULT true;
		`);
		await queryInterface.sequelize.query(`
			ALTER TABLE "Users" ALTER COLUMN "isFeedPublic" SET DEFAULT true;
		`);
		await queryInterface.sequelize.query(`
			ALTER TABLE "Users" ALTER COLUMN "isActive" SET DEFAULT true;
		`);
	},

	async down() {
		// Intentionally no-op: this migration reconciles drift; reverting could
		// re-break a healthy schema in environments that were never drifted.
	}
};
