import { literal, type Order } from "sequelize";

import { Backlog } from "../backlog/backlog.model";

export const PLATINUMS_BULK_ACTIONS = ["delete"] as const;

export const PLATINUM_RUN_INCLUDE = {
	model: Backlog,
	attributes: ["id", "isPublic"],
	required: false
};

export const REWIND_PLATINUM_ATTRS = ["id", "backlogId", "platinumedAt"];

export const REWIND_PLATINUM_GAME_ATTRS = [
	"id",
	"gameId",
	"platformId",
	"platinumedAt"
];

export const EARLIEST_PLATINUMS_FIRST: Order = [
	["platinumedAt", "ASC"],
	["id", "ASC"]
];

export const LATEST_PLATINUMS_FIRST: Order = [
	literal('"GamePlatinum"."platinumedAt" DESC NULLS LAST'),
	["createdAt", "DESC"],
	["id", "ASC"]
];
