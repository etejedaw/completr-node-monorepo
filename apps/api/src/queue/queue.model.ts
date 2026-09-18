import { DataTypes, Model, Sequelize } from "sequelize";

import { type Backlog } from "../backlog/backlog.model";
import { sequelize } from "../database/sequelize.database";
import { type Game } from "../games/game.model";
import { type Platform } from "../platforms/platform.model";

interface BacklogWithIncludes extends Backlog {
	Game: Game;
	Platform: Platform;
}

class Queue extends Model {
	declare id: string;
	declare userId: string;
	declare backlogId: string;
	declare position: number;
	declare createdAt: Date;
	declare updatedAt: Date;
	declare Backlog: BacklogWithIncludes;
}

Queue.init(
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
		backlogId: {
			type: DataTypes.UUID,
			allowNull: false
		},
		position: {
			type: DataTypes.INTEGER,
			allowNull: false
		}
	},
	{
		sequelize,
		indexes: [{ unique: true, fields: ["userId", "backlogId"] }]
	}
);

export { Queue };
