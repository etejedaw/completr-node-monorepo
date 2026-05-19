import { DataTypes, Model, Sequelize } from "sequelize";
import { sequelize } from "../database/sequelize.database";
import { User } from "../users/user.model";
import { ActivityGame } from "./targets/activity-game.model";
import { ActivityList } from "./targets/activity-list.model";
import { ActivityUser } from "./targets/activity-user.model";

export const ACTIVITY_TYPES = [
	"backlog_added",
	"backlog_completed",
	"backlog_abandoned",
	"backlog_playing",
	"backlog_not_started",
	"wishlist_added",
	"favorite_added",
	"list_created",
	"list_followed",
	"user_followed",
	"game_reviewed"
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

class Activity extends Model {
	declare id: string;
	declare userId: string;
	declare type: ActivityType;
	declare createdAt: Date;
	declare updatedAt: Date;
	declare User: User;
	declare ActivityGame: ActivityGame | null;
	declare ActivityList: ActivityList | null;
	declare ActivityUser: ActivityUser | null;
}

Activity.init(
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
		type: {
			type: DataTypes.STRING,
			allowNull: false
		}
	},
	{
		sequelize,
		indexes: [{ fields: ["userId", "createdAt"] }]
	}
);

export { Activity };
