import { type BacklogStats } from "../public-profile.model";

export interface LibrarySegment {
	status: keyof Omit<BacklogStats, "total">;
	label: string;
	count: number;
	percent: number;
	barClass: string;
	dotClass: string;
}
