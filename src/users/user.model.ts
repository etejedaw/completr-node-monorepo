import { DataTypes, Model, Sequelize } from "sequelize";
import { sequelize } from "../database/sequelize.database";

class User extends Model {
	declare id: string;
	declare username: string;
	declare email: string;
	declare password: string;
	declare name: string;
	declare bio?: string;
	declare avatarUrl: string;
	declare isPublic: boolean;
	declare isPremium: boolean;
	declare isActive: boolean;
}

User.init(
	{
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			defaultValue: Sequelize.literal("gen_random_uuid()")
		},
		username: { type: DataTypes.STRING(15), unique: true, allowNull: false },
		email: { type: DataTypes.STRING, unique: true, allowNull: false },
		password: { type: DataTypes.STRING, allowNull: false },
		name: DataTypes.STRING(80),
		bio: DataTypes.STRING(250),
		avatarUrl: DataTypes.STRING,
		isPublic: { type: DataTypes.BOOLEAN, defaultValue: true },
		isPremium: { type: DataTypes.BOOLEAN, defaultValue: false },
		isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
	},
	{ sequelize }
);

export { User };
