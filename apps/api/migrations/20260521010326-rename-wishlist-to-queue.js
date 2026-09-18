"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			ALTER TABLE "Wishlists" RENAME TO "Queues";
			ALTER TABLE "Users" RENAME COLUMN "isWishlistPublic" TO "isQueuePublic";
			UPDATE "Activities" SET "type" = 'queue_added' WHERE "type" = 'wishlist_added';
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			UPDATE "Activities" SET "type" = 'wishlist_added' WHERE "type" = 'queue_added';
			ALTER TABLE "Users" RENAME COLUMN "isQueuePublic" TO "isWishlistPublic";
			ALTER TABLE "Queues" RENAME TO "Wishlists";
		`);
	}
};
