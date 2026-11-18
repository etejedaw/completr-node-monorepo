import { DataTypes, Model, Sequelize } from "sequelize";

import { sequelize } from "../database/sequelize.database";
import { DEFAULT_THEME } from "./constants/theme.constants";
import {
	VISIBILITY_LEVELS,
	type VisibilityLevel
} from "./constants/visibility.constants";
import { USER_ROLES, type UserRole } from "./user-role.type";

class User extends Model {
	declare id: string;
	declare username: string;
	declare email: string;
	declare password: string;
	declare role: UserRole;
	declare name: string;
	declare bio?: string;
	declare avatarUrl?: string | null;
	declare profileVisibility: VisibilityLevel;
	declare queueVisibility: VisibilityLevel;
	declare wishlistVisibility: VisibilityLevel;
	declare favoriteVisibility: VisibilityLevel;
	declare feedVisibility: VisibilityLevel;
	declare backlogVisibility: VisibilityLevel;
	declare shelfVisibility: VisibilityLevel;
	declare listVisibility: VisibilityLevel;
	declare platinumVisibility: VisibilityLevel;
	declare franchiseVisibility: VisibilityLevel;
	declare rewindVisibility: VisibilityLevel;
	declare tagVisibility: VisibilityLevel;
	declare acceptFollowRequests: boolean;
	declare theme: string;
	declare isActive: boolean;
	declare createdAt: Date;
	declare updatedAt: Date;
}

const visibilityField = () => ({
	type: DataTypes.ENUM(...VISIBILITY_LEVELS),
	allowNull: false,
	defaultValue: "public" as VisibilityLevel
});

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
		profileVisibility: visibilityField(),
		queueVisibility: visibilityField(),
		wishlistVisibility: visibilityField(),
		favoriteVisibility: visibilityField(),
		feedVisibility: visibilityField(),
		backlogVisibility: visibilityField(),
		shelfVisibility: visibilityField(),
		listVisibility: visibilityField(),
		platinumVisibility: visibilityField(),
		franchiseVisibility: visibilityField(),
		rewindVisibility: visibilityField(),
		tagVisibility: visibilityField(),
		acceptFollowRequests: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: true
		},
		theme: {
			type: DataTypes.STRING(50),
			defaultValue: DEFAULT_THEME
		},
		isActive: {
			type: DataTypes.BOOLEAN,
			defaultValue: true
		}
	},
	{ sequelize }
);

export { User };
