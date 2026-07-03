import { DataTypes, Model, Sequelize } from "sequelize";

import { sequelize } from "../database/sequelize.database";

export const SORT_ORDERS = ["asc", "desc"] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export const STAT_KEYS = [
	"totalEntries",
	"totalRealHours",
	"avgRatio",
	"avgPersonalRatio",
	"completionRate",
	"abandonmentRate",
	"avgRealDuration",
	"avgEstimatedDuration",
	"avgScore",
	"avgUserRating",
	"estimatedVsRealDelta",
	"longestPlayed",
	"bestPersonalRatio",
	"highestRated",
	"countByStatus"
] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export const SAVED_FILTER_ICONS = [
	"bookmark",
	"star",
	"favorite",
	"sports_esports",
	"emoji_events",
	"flag",
	"check_circle",
	"schedule",
	"bolt",
	"local_fire_department",
	"filter_alt",
	"list",
	"calendar_month",
	"military_tech",
	"rocket_launch",
	"visibility"
] as const;
export type SavedFilterIcon = (typeof SAVED_FILTER_ICONS)[number];

export const SAVED_FILTER_COLORS = [
	"brand",
	"sky",
	"emerald",
	"amber",
	"rose",
	"purple",
	"teal",
	"slate"
] as const;
export type SavedFilterColor = (typeof SAVED_FILTER_COLORS)[number];

class SavedFilter extends Model {
	declare id: string;
	declare userId: string;
	declare name: string;
	declare description?: string;
	declare filters: Record<string, unknown>;
	declare sortBy?: string;
	declare sortOrder: string;
	declare showInBacklog: boolean;
	declare isDefault: boolean;
	declare enabledStats: string[] | null;
	declare position: number;
	declare icon: string | null;
	declare color: string | null;
	declare createdAt: Date;
	declare updatedAt: Date;
}

SavedFilter.init(
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
		name: {
			type: DataTypes.STRING(100),
			allowNull: false
		},
		description: DataTypes.STRING(255),
		filters: {
			type: DataTypes.JSONB,
			allowNull: false
		},
		sortBy: DataTypes.STRING(50),
		sortOrder: {
			type: DataTypes.ENUM(...SORT_ORDERS),
			allowNull: false,
			defaultValue: "desc"
		},
		showInBacklog: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: true
		},
		isDefault: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false
		},
		enabledStats: {
			type: DataTypes.ARRAY(DataTypes.TEXT),
			allowNull: true,
			defaultValue: null
		},
		position: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 0
		},
		icon: {
			type: DataTypes.STRING(50),
			allowNull: true,
			defaultValue: null
		},
		color: {
			type: DataTypes.STRING(20),
			allowNull: true,
			defaultValue: null
		}
	},
	{ sequelize }
);

export { SavedFilter };
