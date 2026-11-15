import { type Order } from "sequelize";

export const FREE_WISHLIST_LIMIT = 20;

export const WISHLIST_ORDER: Order = [
	["position", "ASC"],
	["id", "ASC"]
];
