import { DataTypes, Model, Sequelize } from "sequelize";
import { sequelize } from "../database/sequelize.database";

export const SCORE_SOURCES = [
	"metacritic",
	"opencritic",
	"rawg",
	"completr"
] as const;

export type ScoreSource = (typeof SCORE_SOURCES)[number];

export const SCORE_SOURCES_API = ["metacritic", "opencritic", "rawg"] as const;

class GameScore extends Model {
	declare id: string;
	declare gameId: string;
	declare source: ScoreSource;
	declare score: number;
	declare updatedAt: Date;
}

GameScore.init(
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
			type: DataTypes.ENUM(...SCORE_SOURCES),
			allowNull: false
		},
		score: {
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

export { GameScore };
