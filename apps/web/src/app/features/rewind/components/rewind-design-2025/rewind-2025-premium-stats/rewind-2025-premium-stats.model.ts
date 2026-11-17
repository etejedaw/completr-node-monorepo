import {
	type RewindCriticGap,
	type RewindGenre
} from "../../../../../core/models/rewind.model";

export interface Rewind2025MonthHoursBar {
	month: number;
	hours: number;
	heightPercent: number;
	isPeak: boolean;
}

export interface Rewind2025CriticGapRow extends RewindCriticGap {
	direction: "more" | "less" | "same";
	widthPercent: number;
}

export interface Rewind2025GenreShareRow extends RewindGenre {
	sharePercent: number;
	widthPercent: number;
	isOthers: boolean;
}
