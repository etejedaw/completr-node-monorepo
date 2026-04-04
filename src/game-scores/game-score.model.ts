import { DataTypes, Model } from "sequelize";
import { sequelize } from "../database/sequelize.database";

export type ScoreSource = "metacritic" | "opencritic" | "hltb" | "backlogr";

class GameScore extends Model {
	declare gameId: string;
	declare source: ScoreSource;
	declare score?: number;
	declare duration?: number;
	declare count: number;
	declare updatedAt: Date;
}

GameScore.init(
	{
		gameId: {
			type: DataTypes.UUID,
			primaryKey: true
		},
		source: {
			type: DataTypes.ENUM(
				"metacritic",
				"opencritic",
				"hltb",
				"backlogr"
			),
			primaryKey: true
		},
		score: DataTypes.FLOAT,
		duration: DataTypes.FLOAT,
		count: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 1
		}
	},
	{
		sequelize,
		indexes: [{ unique: true, fields: ["gameId", "source"] }],
		createdAt: false
	}
);

export { GameScore };
