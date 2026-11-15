import { literal, type Order } from "sequelize";

import { Backlog } from "../backlog/backlog.model";

export const PLATINUMS_BULK_ACTIONS = ["delete"] as const;

export const PLATINUM_RUN_INCLUDE = {
	model: Backlog,
	attributes: ["id", "isPublic"],
	required: false
};

export const LATEST_PLATINUMS_FIRST: Order = [
	literal('"GamePlatinum"."platinumedAt" DESC NULLS LAST'),
	["createdAt", "DESC"],
	["id", "ASC"]
];
