import { DataTypes, Model, Sequelize } from "sequelize";

import { sequelize } from "../database/sequelize.database";

class UserInvitation extends Model {
	declare id: string;
	declare email: string;
	declare tokenHash: string;
	declare invitedById: string | null;
	declare expiresAt: Date;
	declare createdAt: Date;
	declare updatedAt: Date;
}

UserInvitation.init(
	{
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			allowNull: false,
			defaultValue: Sequelize.literal("gen_random_uuid()")
		},
		email: {
			type: DataTypes.STRING,
			allowNull: false
		},
		tokenHash: {
			type: DataTypes.STRING(64),
			allowNull: false
		},
		invitedById: {
			type: DataTypes.UUID,
			allowNull: true
		},
		expiresAt: {
			type: DataTypes.DATE,
			allowNull: false
		}
	},
	{
		sequelize,
		indexes: [
			{ fields: ["email"], unique: true },
			{ fields: ["tokenHash"], unique: true }
		]
	}
);

export { UserInvitation };
