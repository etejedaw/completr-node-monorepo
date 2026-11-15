import { type Order } from "sequelize";

export const FREE_FILTER_LIMIT = 5;

export const SAVED_FILTER_ORDER: Order = [
	["position", "ASC"],
	["createdAt", "DESC"],
	["id", "ASC"]
];
