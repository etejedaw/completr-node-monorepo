import { DataTypes, Model, Sequelize } from "sequelize";

import { sequelize } from "../database/sequelize.database";
import { REWIND_LANGUAGES, type RewindLanguage } from "./rewind.constants";
import {
	type RewindAiRecap,
	type RewindPremiumStats
} from "./rewind.interface";

export const REWIND_AI_RECAP_STATUSES = [
	"none",
	"pending",
	"ready",
	"failed"
] as const;
export type RewindAiRecapStatus = (typeof REWIND_AI_RECAP_STATUSES)[number];

class Rewind extends Model {
	declare id: string;
	declare userId: string;
	declare year: number;
	declare language: RewindLanguage;
	declare includesPrivateRuns: boolean;
	declare includesNotes: boolean;
	declare generatedAt: Date;
	declare regenerationsUsed: number;
	declare graceUsed: boolean;
	declare aiRecap: RewindAiRecap | null;
	declare aiRecapStatus: RewindAiRecapStatus;
	declare aiRecapRequestedAt: Date | null;
	declare premiumStats: RewindPremiumStats | null;
	declare createdAt: Date;
	declare updatedAt: Date;
}

Rewind.init(
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
		year: {
			type: DataTypes.INTEGER,
			allowNull: false
		},
		language: {
			type: DataTypes.ENUM(...REWIND_LANGUAGES),
			allowNull: false
		},
		includesPrivateRuns: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false
		},
		includesNotes: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false
		},
		generatedAt: {
			type: DataTypes.DATE,
			allowNull: false
		},
		regenerationsUsed: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 0
		},
		graceUsed: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false
		},
		aiRecap: {
			type: DataTypes.JSONB,
			allowNull: true
		},
		aiRecapStatus: {
			type: DataTypes.ENUM(...REWIND_AI_RECAP_STATUSES),
			allowNull: false,
			defaultValue: "none"
		},
		aiRecapRequestedAt: {
			type: DataTypes.DATE,
			allowNull: true
		},
		premiumStats: {
			type: DataTypes.JSONB,
			allowNull: true
		}
	},
	{
		sequelize,
		indexes: [{ unique: true, fields: ["userId", "year"] }]
	}
);

export { Rewind };
