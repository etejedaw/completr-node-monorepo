import { DataTypes, Model, Sequelize } from "sequelize";
import { sequelize } from "../database/sequelize.database";

class MoodTagMeta extends Model {
	declare id: string;
	declare userId: string;
	declare tag: string;
	declare description: string | null;
	declare createdAt: Date;
	declare updatedAt: Date;
}

MoodTagMeta.init(
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
		tag: {
			type: DataTypes.STRING(40),
			allowNull: false
		},
		description: {
			type: DataTypes.STRING(255),
			allowNull: true
		}
	},
	{
		sequelize,
		tableName: "MoodTagMetas",
		indexes: [{ unique: true, fields: ["userId", "tag"] }]
	}
);

export { MoodTagMeta };
