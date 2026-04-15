import { DataTypes, Model, Sequelize } from "sequelize";
import { sequelize } from "../database/sequelize.database";
import { User } from "../users/user.model";
import { Game } from "../games/game.model";

export const ACTIVITY_TYPES = [
	"backlog_added",
	"backlog_completed",
	"backlog_abandoned",
	"backlog_playing",
	"favorite_added",
	"list_created",
	"list_followed",
	"user_followed"
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

class Activity extends Model {
	declare id: string;
	declare userId: string;
	declare type: ActivityType;
	declare gameId: string | null;
	declare metadata: Record<string, unknown> | null;
	declare createdAt: Date;
	declare updatedAt: Date;
	declare User: User;
	declare Game: Game | null;
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
		},
		gameId: {
			type: DataTypes.UUID,
			allowNull: true
		},
		metadata: {
			type: DataTypes.JSONB,
			allowNull: true
		}
	},
	{
		sequelize,
		indexes: [{ fields: ["userId", "createdAt"] }]
	}
);

export { Activity };
