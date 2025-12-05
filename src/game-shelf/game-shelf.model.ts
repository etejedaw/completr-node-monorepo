import { DataTypes, Model, Sequelize } from "sequelize";
import { sequelize } from "../database/sequelize.database";

class GameShelf extends Model {
	declare id: string;
	declare userId: string;
	declare gameId: string;
	declare platformId: string;
	declare acquiredAt?: Date;
	declare edition?: string;
	declare notes?: string;
	declare createdAt: Date;
	declare updatedAt: Date;
}

GameShelf.init(
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
		acquiredAt: DataTypes.DATE,
		edition: DataTypes.STRING(100),
		notes: DataTypes.STRING(100)
	},
	{ sequelize }
);

export { GameShelf };
