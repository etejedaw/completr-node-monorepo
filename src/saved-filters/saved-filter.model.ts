import { DataTypes, Model, Sequelize } from "sequelize";
import { sequelize } from "../database/sequelize.database";

export const SORT_ORDERS = ["asc", "desc"] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

class SavedFilter extends Model {
	declare id: string;
	declare userId: string;
	declare name: string;
	declare description?: string;
	declare filters: Record<string, unknown>;
	declare sortBy?: string;
	declare sortOrder: string;
	declare showInBacklog: boolean;
	declare isDefault: boolean;
	declare createdAt: Date;
	declare updatedAt: Date;
}

SavedFilter.init(
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
		description: DataTypes.STRING(255),
		filters: {
			type: DataTypes.JSONB,
			allowNull: false
		},
		sortBy: DataTypes.STRING(50),
		sortOrder: {
			type: DataTypes.ENUM(...SORT_ORDERS),
			allowNull: false,
			defaultValue: "desc"
		},
		showInBacklog: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: true
		},
		isDefault: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false
		}
	},
	{ sequelize }
);

export { SavedFilter };
