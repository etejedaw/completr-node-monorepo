import { DataTypes, Model, Sequelize } from "sequelize";
import { sequelize } from "../database/sequelize.database";

class AuditLog extends Model {
	declare id: string;
	declare userId: string;
	declare action: string;
	declare targetType: string;
	declare targetId: string;
	declare createdAt: Date;
	declare User: { id: string; username: string; name: string } | null;
}

AuditLog.init(
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
		action: {
			type: DataTypes.STRING(50),
			allowNull: false
		},
		targetType: {
			type: DataTypes.STRING(30),
			allowNull: false
		},
		targetId: {
			type: DataTypes.STRING,
			allowNull: false
		}
	},
	{
		sequelize,
		updatedAt: false
	}
);

export { AuditLog };
