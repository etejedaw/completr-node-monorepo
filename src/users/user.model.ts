import { DataTypes, Model, Sequelize } from "sequelize";
import { sequelize } from "../database/sequelize.database";
import { USER_ROLES, UserRole } from "./user-role.type";

class User extends Model {
	declare id: string;
	declare username: string;
	declare email: string;
	declare password: string;
	declare role: UserRole;
	declare name: string;
	declare bio?: string;
	declare avatarUrl?: string;
	declare isPublic: boolean;
	declare isWishlistPublic: boolean;
	declare isFavoritePublic: boolean;
	declare isFeedPublic: boolean;
	declare isActive: boolean;
	declare createdAt: Date;
	declare updatedAt: Date;
}

User.init(
	{
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			allowNull: false,
			defaultValue: Sequelize.literal("gen_random_uuid()")
		},
		username: {
			type: DataTypes.STRING(15),
			unique: true,
			allowNull: false
		},
		email: {
			type: DataTypes.STRING,
			unique: true,
			allowNull: false
		},
		password: {
			type: DataTypes.STRING,
			allowNull: false
		},
		role: {
			type: DataTypes.ENUM(...USER_ROLES),
			allowNull: false,
			defaultValue: "user"
		},
		name: DataTypes.STRING(80),
		bio: DataTypes.STRING(250),
		avatarUrl: DataTypes.STRING,
		isPublic: {
			type: DataTypes.BOOLEAN,
			defaultValue: true
		},
		isWishlistPublic: {
			type: DataTypes.BOOLEAN,
			defaultValue: true
		},
		isFavoritePublic: {
			type: DataTypes.BOOLEAN,
			defaultValue: true
		},
		isFeedPublic: {
			type: DataTypes.BOOLEAN,
			defaultValue: true
		},
		isActive: {
			type: DataTypes.BOOLEAN,
			defaultValue: true
		}
	},
	{ sequelize }
);

export { User };
