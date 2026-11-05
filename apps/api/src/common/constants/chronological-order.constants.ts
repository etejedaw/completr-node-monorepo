import { type Order } from "sequelize";

export const CHRONOLOGICAL_ORDER: Order = [
	["createdAt", "ASC"],
	["id", "ASC"]
];
