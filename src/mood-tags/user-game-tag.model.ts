import { DataTypes, Model, Sequelize } from "sequelize";
import { sequelize } from "../database/sequelize.database";

class UserGameTag extends Model {
	declare id: string;
	declare userId: string;
	declare gameId: string;
	declare tag: string;
	declare createdAt: Date;
}

UserGameTag.init(
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
		tag: {
			type: DataTypes.STRING(40),
			allowNull: false
		}
	},
	{
		sequelize,
		indexes: [
			{ unique: true, fields: ["userId", "gameId", "tag"] },
			{ fields: ["userId", "tag"] },
			{ fields: ["gameId", "tag"] }
		],
		updatedAt: false
	}
);

export { UserGameTag };
