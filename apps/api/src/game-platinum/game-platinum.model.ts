import { DataTypes, Model, Sequelize } from "sequelize";

import { type Backlog } from "../backlog/backlog.model";
import { sequelize } from "../database/sequelize.database";
import { type Game } from "../games/game.model";
import { type Platform } from "../platforms/platform.model";

class GamePlatinum extends Model {
	declare id: string;
	declare userId: string;
	declare gameId: string;
	declare backlogId: string | null;
	declare platformId: string | null;
	declare platinumedAt: string | null;
	declare notes: string | null;
	declare createdAt: Date;
	declare updatedAt: Date;
	declare Backlog?: Pick<Backlog, "id" | "isPublic"> | null;
	declare Game?: Pick<
		Game,
		"id" | "code" | "title" | "backgroundUrl" | "isDlc"
	>;
	declare Platform?: Pick<Platform, "id" | "name" | "abbreviation"> | null;
}

GamePlatinum.init(
	{
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			allowNull: false,
			defaultValue: Sequelize.literal("gen_random_uuid()")
		},
		userId: {
			type: DataTypes.UUID,
			allowNull: false
		},
		gameId: {
			type: DataTypes.UUID,
			allowNull: false
		},
		backlogId: {
			type: DataTypes.UUID,
			allowNull: true
		},
		platformId: {
			type: DataTypes.UUID,
			allowNull: true
		},
		platinumedAt: {
			type: DataTypes.DATEONLY,
			allowNull: true
		},
		notes: {
			type: DataTypes.STRING(500),
			allowNull: true
		}
	},
	{
		sequelize,
		indexes: [
			{ unique: true, fields: ["userId", "gameId"] },
			{ fields: ["gameId"] },
			{ fields: ["backlogId"] }
		]
	}
);

export { GamePlatinum };
