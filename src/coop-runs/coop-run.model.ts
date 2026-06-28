import { DataTypes, Model, Sequelize } from "sequelize";

import { sequelize } from "../database/sequelize.database";

class CoopRun extends Model {
	declare id: string;
	declare gameId: string;
	declare createdAt: Date;
}

CoopRun.init(
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
		}
	},
	{
		sequelize,
		updatedAt: false,
		indexes: [{ fields: ["gameId"] }]
	}
);

export { CoopRun };
