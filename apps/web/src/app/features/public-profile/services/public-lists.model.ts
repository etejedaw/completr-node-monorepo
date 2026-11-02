import { type ListPreviewItem } from "../../../core/models";

export interface PublicList {
	id: string;
	name: string;
	description?: string;
	isPublic?: boolean;
	isOfficial?: boolean;
	owner?: { username: string } | null;
	previewItems?: ListPreviewItem[];
	scoreSource: string;
	durationSource: string;
	followerCount: number;
	progress?: { completed: number; total: number };
}

export type PublicListsQuery = {
	limit?: number;
	offset?: number;
	search?: string;
};

export interface PublicListsPage {
	items: PublicList[];
	total: number;
}
