import { DataTypes, Model, Sequelize } from "sequelize";

import { sequelize } from "../database/sequelize.database";

class Job extends Model {
	declare id: string;
	declare type: string;
	declare status:
		"pending" | "running" | "completed" | "failed" | "cancelled";
	declare result: string | null;
	declare createdAt: Date;
	declare updatedAt: Date;
	declare completedAt: Date | null;
}

Job.init(
	{
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			allowNull: false,
			defaultValue: Sequelize.literal("gen_random_uuid()")
		},
		type: {
			type: DataTypes.STRING(50),
			allowNull: false
		},
		status: {
			type: DataTypes.STRING(20),
			allowNull: false,
			defaultValue: "pending"
		},
		result: {
			type: DataTypes.TEXT,
			allowNull: true
		},
		completedAt: {
			type: DataTypes.DATE,
			allowNull: true
		}
	},
	{ sequelize }
);

export { Job };
