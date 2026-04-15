import { DataTypes, Model, Sequelize } from "sequelize";
import { sequelize } from "../database/sequelize.database";
import { User } from "../users/user.model";

class UserFollower extends Model {
	declare id: string;
	declare followerId: string;
	declare followingId: string;
	declare createdAt: Date;
	declare updatedAt: Date;
	declare Follower: User;
	declare Following: User;
}

UserFollower.init(
	{
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			allowNull: false,
			defaultValue: Sequelize.literal("gen_random_uuid()")
		},
		followerId: {
			type: DataTypes.UUID,
			allowNull: false
		},
		followingId: {
			type: DataTypes.UUID,
			allowNull: false
		}
	},
	{
		sequelize,
		indexes: [{ unique: true, fields: ["followerId", "followingId"] }]
	}
);

export { UserFollower };
