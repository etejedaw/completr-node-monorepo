import { DataTypes, Model, Sequelize } from "sequelize";

import { sequelize } from "../database/sequelize.database";

class PasswordResetToken extends Model {
	declare id: string;
	declare userId: string;
	declare tokenHash: string;
	declare expiresAt: Date;
	declare createdAt: Date;
	declare updatedAt: Date;
}

PasswordResetToken.init(
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
		tokenHash: {
			type: DataTypes.STRING(64),
			allowNull: false
		},
		expiresAt: {
			type: DataTypes.DATE,
			allowNull: false
		}
	},
	{
		sequelize,
		indexes: [
			{ fields: ["userId"] },
			{ fields: ["tokenHash"], unique: true }
		]
	}
);

export { PasswordResetToken };
