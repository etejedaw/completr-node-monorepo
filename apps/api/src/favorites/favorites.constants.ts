import { type Order } from "sequelize";

export const FAVORITES_BULK_ACTIONS = ["add", "remove"] as const;

export const FREE_FAVORITE_LIMIT = 10;

export const FAVORITES_ORDER: Order = [
	["position", "ASC"],
	["id", "ASC"]
];
