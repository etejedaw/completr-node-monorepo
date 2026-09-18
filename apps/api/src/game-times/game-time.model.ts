import { DataTypes, Model, Sequelize } from "sequelize";

import { sequelize } from "../database/sequelize.database";

export const TIME_SOURCES = ["hltb", "rawg", "completr"] as const;
export type TimeSource = (typeof TIME_SOURCES)[number];

export const TIME_SOURCES_API = ["hltb", "rawg"] as const;

class GameTime extends Model {
	declare id: string;
	declare gameId: string;
	declare source: TimeSource;
	declare duration: number;
	declare updatedAt: Date;
}

GameTime.init(
	{
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			allowNull: false,
			defaultValue: Sequelize.literal("gen_random_uuid()")
		},
		gameId: {
			type: DataTypes.UUID,
			allowNull: false
		},
		source: {
			type: DataTypes.ENUM(...TIME_SOURCES),
			allowNull: false
		},
		duration: {
			type: DataTypes.FLOAT,
			allowNull: false
		}
	},
	{
		sequelize,
		indexes: [{ unique: true, fields: ["gameId", "source"] }],
		createdAt: false
	}
);

export { GameTime };
