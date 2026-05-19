export interface List {
	id: string;
	userId: string;
	name: string;
	description?: string;
	isPublic: boolean;
	scoreSource: string;
	durationSource: string;
	items: ListItem[];
	previewItems?: ListPreviewItem[];
	followerCount?: number;
	isFollowing?: boolean;
	progress?: { completed: number; total: number } | null;
}

export interface FollowingList {
	id: string;
	name: string;
	description?: string;
	isPublic: boolean;
	scoreSource: string;
	durationSource: string;
	isVisible: boolean;
	progress: { completed: number; total: number };
	previewItems?: ListPreviewItem[];
}

export interface ListPreviewItem {
	id: string;
	game: {
		id: string;
		code: string;
		title: string;
		backgroundUrl?: string;
	} | null;
}

export interface ListItem {
	id: string;
	position: number;
	score?: number;
	duration?: number;
	ratio?: number;
	game: ListItemGame;
	backlogStatus?: string;
}

interface ListItemGame {
	id: string;
	code: string;
	title: string;
	backgroundUrl?: string;
	isDlc: boolean;
}
