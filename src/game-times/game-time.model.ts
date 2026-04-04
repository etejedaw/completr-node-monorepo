import { DataTypes, Model, Sequelize } from "sequelize";
import { sequelize } from "../database/sequelize.database";

export type TimeSource = "hltb" | "rawg" | "backlogr";

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
			type: DataTypes.ENUM("hltb", "rawg", "backlogr"),
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
