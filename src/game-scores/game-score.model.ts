import { DataTypes, Model, Sequelize } from "sequelize";
import { sequelize } from "../database/sequelize.database";

class GameScore extends Model {
	declare id: string;
	declare gameId: string;
	declare source: string;
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
			type: DataTypes.STRING(50),
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
