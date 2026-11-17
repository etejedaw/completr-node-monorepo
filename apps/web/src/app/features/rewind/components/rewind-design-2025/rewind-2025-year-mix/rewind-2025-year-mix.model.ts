import { type RewindLengthRange } from "../../../../../core/models/rewind.model";

export interface Rewind2025LengthMixRow {
	range: RewindLengthRange;
	count: number;
	sharePercent: number;
	widthPercent: number;
}

export interface Rewind2025ReleaseDecadeColumn {
	decade: number;
	count: number;
	heightPercent: number;
	isPeak: boolean;
}
