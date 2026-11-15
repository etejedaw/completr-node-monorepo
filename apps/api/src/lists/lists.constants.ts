import { type Order } from "sequelize";

export const FREE_LIST_LIMIT = 5;
export const LIST_PREVIEW_SIZE = 4;
export const FINISHED_STATUSES = ["completed", "abandoned", "endless"];

export const LIST_ORDER_NEWEST_FIRST: Order = [
	["createdAt", "DESC"],
	["id", "DESC"]
];
