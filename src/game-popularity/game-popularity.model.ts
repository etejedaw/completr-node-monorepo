import { DataTypes, Model, Sequelize } from "sequelize";

import { sequelize } from "../database/sequelize.database";

class GamePopularity extends Model {
	declare id: string;
	declare gameId: string;
	declare score: number;
	declare updatedAt: Date;
}

GamePopularity.init(
	{
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			allowNull: false,
			defaultValue: Sequelize.literal("gen_random_uuid()")
		},
		gameId: {
			type: DataTypes.UUID,
			allowNull: false,
			unique: true
		},
		score: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 0
		}
	},
	{
		sequelize,
		createdAt: false
	}
);

export { GamePopularity };
