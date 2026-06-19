import { DataTypes, Model, Sequelize } from "sequelize";
import { sequelize } from "../database/sequelize.database";
import { User } from "../users/user.model";

class UserFollowRequest extends Model {
	declare id: string;
	declare requesterId: string;
	declare targetId: string;
	declare createdAt: Date;
	declare updatedAt: Date;
	declare Requester?: User;
	declare Target?: User;
}

UserFollowRequest.init(
	{
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			allowNull: false,
			defaultValue: Sequelize.literal("gen_random_uuid()")
		},
		requesterId: {
			type: DataTypes.UUID,
			allowNull: false
		},
		targetId: {
			type: DataTypes.UUID,
			allowNull: false
		}
	},
	{
		sequelize,
		indexes: [{ unique: true, fields: ["requesterId", "targetId"] }]
	}
);

export { UserFollowRequest };
