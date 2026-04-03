import { DataTypes, Model, Sequelize } from "sequelize";
import { sequelize } from "../database/sequelize.database";

export type ListType = "collection" | "challenge";

class List extends Model {
	declare id: string;
	declare userId: string;
	declare name: string;
	declare slug: string;
	declare type: ListType;
	declare isDefault: boolean;
	declare isPublic: boolean;
	declare startDate?: Date;
	declare endDate?: Date;
	declare targetCount?: number;
	declare createdAt: Date;
	declare updatedAt: Date;
}

List.init(
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
		name: {
			type: DataTypes.STRING(100),
			allowNull: false
		},
		slug: {
			type: DataTypes.STRING(100),
			allowNull: false
		},
		type: {
			type: DataTypes.ENUM("collection", "challenge"),
			allowNull: false
		},
		isDefault: {
			type: DataTypes.BOOLEAN,
			defaultValue: false
		},
		isPublic: {
			type: DataTypes.BOOLEAN,
			defaultValue: false
		},
		startDate: DataTypes.DATE,
		endDate: DataTypes.DATE,
		targetCount: DataTypes.INTEGER
	},
	{ sequelize }
);

export { List };
