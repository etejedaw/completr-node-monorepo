import { DataTypes, Model, Sequelize } from "sequelize";
import { sequelize } from "../database/sequelize.database";

class RefreshToken extends Model {
	declare id: string;
	declare userId: string;
	declare token: string;
	declare expiresAt: Date;
	declare deviceInfo: string | null;
	declare lastUsedAt: Date | null;
	declare createdAt: Date;
	declare updatedAt: Date;
}

RefreshToken.init(
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
		token: {
			type: DataTypes.STRING,
			allowNull: false
		},
		expiresAt: {
			type: DataTypes.DATE,
			allowNull: false
		},
		deviceInfo: {
			type: DataTypes.TEXT,
			allowNull: true
		},
		lastUsedAt: {
			type: DataTypes.DATE,
			allowNull: true
		}
	},
	{
		sequelize,
		indexes: [{ fields: ["userId"] }, { fields: ["token"], unique: true }]
	}
);

export { RefreshToken };
