import { DataTypes, Model, Sequelize } from "sequelize";
import { sequelize } from "../database/sequelize.database";
import { Game } from "../games/game.model";
import { Platform } from "../platforms/platform.model";

export type PlaythroughStatus =
	| "not_started"
	| "playing"
	| "completed"
	| "abandoned";

class Playthrough extends Model {
	declare id: string;
	declare userId: string;
	declare gameId: string;
	declare platformId: string;
	declare status: PlaythroughStatus;
	declare startedAt?: Date;
	declare finishedAt?: Date;
	declare realDuration?: number;
	declare userRating?: number;
	declare notes?: string;
	declare createdAt: Date;
	declare updatedAt: Date;
	declare Game: Game;
	declare Platform: Platform;
}

Playthrough.init(
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
		platformId: {
			type: DataTypes.UUID,
			allowNull: false
		},
		status: {
			type: DataTypes.ENUM(
				"not_started",
				"playing",
				"completed",
				"abandoned"
			),
			allowNull: false,
			defaultValue: "not_started"
		},
		startedAt: DataTypes.DATE,
		finishedAt: DataTypes.DATE,
		realDuration: DataTypes.FLOAT,
		userRating: DataTypes.FLOAT,
		notes: DataTypes.TEXT
	},
	{ sequelize }
);

export { Playthrough };
