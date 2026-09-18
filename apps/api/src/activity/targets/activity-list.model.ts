import { DataTypes, Model, Sequelize } from "sequelize";

import { sequelize } from "../../database/sequelize.database";
import { type List } from "../../lists/list.model";

class ActivityList extends Model {
	declare id: string;
	declare activityId: string;
	declare listId: string;
	declare List: List;
}

ActivityList.init(
	{
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			allowNull: false,
			defaultValue: Sequelize.literal("gen_random_uuid()")
		},
		activityId: {
			type: DataTypes.UUID,
			allowNull: false
		},
		listId: {
			type: DataTypes.UUID,
			allowNull: false
		}
	},
	{
		sequelize,
		timestamps: false,
		indexes: [{ unique: true, fields: ["activityId"] }]
	}
);

export { ActivityList };
