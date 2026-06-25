import { DataTypes, Model, Sequelize } from "sequelize";
import { sequelize } from "../database/sequelize.database";

class BacklogProgress extends Model {
	declare id: string;
	declare backlogId: string;
	declare note: string;
	declare createdAt: Date;
}

BacklogProgress.init(
	{
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			allowNull: false,
			defaultValue: Sequelize.literal("gen_random_uuid()")
		},
		backlogId: {
			type: DataTypes.UUID,
			allowNull: false
		},
		note: {
			type: DataTypes.STRING(500),
			allowNull: false
		}
	},
	{
		sequelize,
		updatedAt: false,
		indexes: [{ fields: ["backlogId", "createdAt"] }]
	}
);

export { BacklogProgress };
