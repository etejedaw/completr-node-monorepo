import { DataTypes, Model, Sequelize } from "sequelize";
import { sequelize } from "../database/sequelize.database";

class ListItem extends Model {
	declare id: string;
	declare listId: string;
	declare gameId: string;
	declare playthroughId?: string;
	declare position: number;
	declare createdAt: Date;
	declare updatedAt: Date;
}

ListItem.init(
	{
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			allowNull: false,
			defaultValue: Sequelize.literal("gen_random_uuid()")
		},
		listId: {
			type: DataTypes.UUID,
			allowNull: false
		},
		gameId: {
			type: DataTypes.UUID,
			allowNull: false
		},
		playthroughId: {
			type: DataTypes.UUID,
			allowNull: true
		},
		position: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 0
		}
	},
	{ sequelize }
);

export { ListItem };
