import { DataTypes, Model, Sequelize } from "sequelize";

import { sequelize } from "../database/sequelize.database";
import { type List } from "../lists/list.model";
import { type User } from "../users/user.model";

class ListFollower extends Model {
	declare id: string;
	declare listId: string;
	declare userId: string;
	declare isVisible: boolean;
	declare createdAt: Date;
	declare updatedAt: Date;
	declare User: User;
	declare List: List;
}

ListFollower.init(
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
		userId: {
			type: DataTypes.UUID,
			allowNull: false
		},
		isVisible: {
			type: DataTypes.BOOLEAN,
			defaultValue: true
		}
	},
	{
		sequelize,
		indexes: [{ unique: true, fields: ["listId", "userId"] }]
	}
);

export { ListFollower };
