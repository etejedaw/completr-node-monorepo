import { type Franchise } from "../../franchises/franchises.model";

export interface AdminFranchiseModalData {
	franchise: Franchise | null;
}

export interface SelectedGame {
	id: string;
	title: string;
	backgroundUrl?: string;
	releaseAt?: string;
	franchiseName?: string | null;
}
