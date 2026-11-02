import { type BacklogStatus } from "../../../../core/models";

export interface StatusShare {
	status: BacklogStatus;
	label: string;
	count: number;
	percent: number;
	fillClass: string;
}
