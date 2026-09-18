import { DataTypes, Model, Sequelize } from "sequelize";

import { sequelize } from "../database/sequelize.database";

class UserFranchise extends Model {
	declare id: string;
	declare userId: string;
	declare franchiseId: string;
	declare createdAt: Date;
	declare updatedAt: Date;
}

UserFranchise.init(
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
		franchiseId: {
			type: DataTypes.UUID,
			allowNull: false
		}
	},
	{
		sequelize,
		indexes: [{ unique: true, fields: ["userId", "franchiseId"] }]
	}
);

export { UserFranchise };
