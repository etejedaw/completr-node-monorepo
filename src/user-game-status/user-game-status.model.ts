import { DataTypes, Model } from "sequelize";
import { sequelize } from "../database/sequelize.database";

export type GameStatus = "not_started" | "playing" | "completed" | "abandoned";

class UserGameStatus extends Model {
	declare userId: string;
	declare gameId: string;
	declare status: GameStatus;
	declare playCount: number;
	declare createdAt: Date;
	declare updatedAt: Date;
}

UserGameStatus.init(
	{
		userId: {
			type: DataTypes.UUID,
			primaryKey: true
		},
		gameId: {
			type: DataTypes.UUID,
			primaryKey: true
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
		playCount: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 0
		}
	},
	{
		sequelize,
		indexes: [{ unique: true, fields: ["userId", "gameId"] }]
	}
);

export { UserGameStatus };
