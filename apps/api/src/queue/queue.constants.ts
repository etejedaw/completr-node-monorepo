import { type Order } from "sequelize";

export const QUEUE_BULK_ACTIONS = ["add", "remove"] as const;

export const FREE_QUEUE_LIMIT = 10;

export const QUEUE_ORDER: Order = [
	["position", "ASC"],
	["id", "ASC"]
];
