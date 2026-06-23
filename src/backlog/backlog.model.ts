import { DataTypes, Model, Sequelize } from "sequelize";
import { sequelize } from "../database/sequelize.database";
import { Game } from "../games/game.model";
import { Platform } from "../platforms/platform.model";

export const BACKLOG_STATUSES = [
	"not_started",
	"playing",
	"completed",
	"abandoned",
	"endless"
] as const;

export type BacklogStatus = (typeof BACKLOG_STATUSES)[number];

class Backlog extends Model {
	declare id: string;
	declare userId: string;
	declare gameId: string;
	declare platformId: string;
	declare status: BacklogStatus;
	declare startedAt?: Date;
	declare finishedAt?: Date;
	declare realDuration?: number;
	declare score?: number;
	declare duration?: number;
	declare userRating?: number;
	declare isPublic: boolean;
	declare notes?: string;
	declare compilationGameId?: string | null;
	declare createdAt: Date;
	declare updatedAt: Date;
	declare Game: Game;
	declare Platform: Platform;
	declare CompilationGame?: Game | null;
	declare User?: {
		id: string;
		username: string;
		name: string;
		avatarUrl?: string;
	};
}

Backlog.init(
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
		gameId: {
			type: DataTypes.UUID,
			allowNull: false
		},
		platformId: {
			type: DataTypes.UUID,
			allowNull: false
		},
		status: {
			type: DataTypes.ENUM(...BACKLOG_STATUSES),
			allowNull: false,
			defaultValue: "not_started"
		},
		startedAt: DataTypes.DATEONLY,
		finishedAt: DataTypes.DATEONLY,
		realDuration: DataTypes.FLOAT,
		score: DataTypes.FLOAT,
		duration: DataTypes.FLOAT,
		userRating: DataTypes.FLOAT,
		isPublic: {
			type: DataTypes.BOOLEAN,
			defaultValue: true
		},
		notes: DataTypes.TEXT,
		compilationGameId: {
			type: DataTypes.UUID,
			allowNull: true
		}
	},
	{
		sequelize,
		indexes: [
			{ fields: ["userId", "status", "finishedAt"] },
			{ fields: ["userId", "isPublic"] },
			{ fields: ["userId", "gameId"] },
			{ fields: ["gameId", "isPublic"] }
		]
	}
);

export { Backlog };
