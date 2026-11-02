import { type RewindLengthRange } from "../../../../core/models/rewind.model";

export interface LengthMixRow {
	range: RewindLengthRange;
	count: number;
	sharePercent: number;
	widthPercent: number;
}

export interface ReleaseDecadeColumn {
	decade: number;
	count: number;
	heightPercent: number;
	isPeak: boolean;
}
