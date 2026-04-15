import { DataTypes, Model, Sequelize } from "sequelize";
import { sequelize } from "../../database/sequelize.database";
import { User } from "../../users/user.model";

class ActivityUser extends Model {
	declare id: string;
	declare activityId: string;
	declare targetUserId: string;
	declare TargetUser: User;
}

ActivityUser.init(
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
		targetUserId: {
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

export { ActivityUser };
