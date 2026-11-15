import { type Order } from "sequelize";

export const GAME_SHELF_BULK_ACTIONS = ["delete"] as const;

export const FREE_SHELF_LIMIT = 250;

export const SHELF_ORDER: Order = [
	["createdAt", "DESC"],
	["id", "DESC"]
];
