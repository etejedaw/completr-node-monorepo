import { type Transaction } from "sequelize";

export interface CompactPositionsOptions {
	table: "Favorites" | "ListItems" | "Queues" | "Wishlists";
	ownerColumn: "listId" | "userId";
	ownerIds: string[];
	transaction: Transaction;
}
