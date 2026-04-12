export interface List {
	id: string;
	name: string;
	description?: string;
	isPublic: boolean;
	scoreSource: string;
	durationSource: string;
	items: ListItem[];
	followerCount?: number;
	isFollowing?: boolean;
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
