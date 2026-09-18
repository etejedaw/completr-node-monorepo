import { DataTypes, Model, Sequelize } from "sequelize";

import { sequelize } from "../database/sequelize.database";

export const REPORT_STATUSES = ["pending", "approved", "rejected"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_CATEGORIES = [
	"general",
	"missing_score",
	"missing_duration"
] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

class GameReport extends Model {
	declare id: string;
	declare gameId: string;
	declare userId: string;
	declare message: string;
	declare status: ReportStatus;
	declare category: ReportCategory;
	declare createdAt: Date;
	declare updatedAt: Date;
}

GameReport.init(
	{
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			allowNull: false,
			defaultValue: Sequelize.literal("gen_random_uuid()")
		},
		gameId: {
			type: DataTypes.UUID,
			allowNull: false
		},
		userId: {
			type: DataTypes.UUID,
			allowNull: false
		},
		message: {
			type: DataTypes.TEXT,
			allowNull: false
		},
		status: {
			type: DataTypes.ENUM(...REPORT_STATUSES),
			allowNull: false,
			defaultValue: "pending"
		},
		category: {
			type: DataTypes.ENUM(...REPORT_CATEGORIES),
			allowNull: false,
			defaultValue: "general"
		}
	},
	{
		sequelize,
		indexes: [{ unique: true, fields: ["gameId", "userId", "category"] }]
	}
);

export { GameReport };
