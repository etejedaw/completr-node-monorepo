import {
	type RewindCriticGap,
	type RewindGenre
} from "../../../../core/models/rewind.model";

export interface MonthHoursBar {
	month: number;
	hours: number;
	heightPercent: number;
	isPeak: boolean;
}

export interface CriticGapRow extends RewindCriticGap {
	direction: "more" | "less" | "same";
	widthPercent: number;
}

export interface BacklogFlowBar {
	month: number;
	added: number;
	finished: number;
	addedPercent: number;
	finishedPercent: number;
}

export interface GenreShareRow extends RewindGenre {
	sharePercent: number;
	widthPercent: number;
	isOthers: boolean;
}
