import { DataTypes, Model, Sequelize } from "sequelize";

import { sequelize } from "../database/sequelize.database";

class Review extends Model {
	declare id: string;
	declare userId: string;
	declare gameId: string;
	declare content: string | null;
	declare rating: number | null;
	declare createdAt: Date;
	declare updatedAt: Date;
	declare User: {
		id: string;
		username: string;
		name: string;
		avatarUrl: string | null;
	};
	declare Game: { id: string; code: string; title: string };
}

Review.init(
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
		content: {
			type: DataTypes.TEXT,
			allowNull: true
		},
		rating: {
			type: DataTypes.FLOAT,
			allowNull: true
		}
	},
	{
		sequelize,
		indexes: [
			{
				unique: true,
				fields: ["userId", "gameId"]
			}
		]
	}
);

export { Review };
