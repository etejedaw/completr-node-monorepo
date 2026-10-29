import { type ListPreviewItem } from "../../../core/models";

export interface ListCardList {
	id: string;
	name: string;
	description?: string;
	isOfficial?: boolean;
	owner?: { username: string } | null;
	previewItems?: ListPreviewItem[];
	followerCount?: number;
	isPublic?: boolean;
	progress?: { completed: number; total: number } | null;
}
