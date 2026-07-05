export interface FavoriteEntry {
	id: string;
	position: number;
	inBacklog?: boolean;
	moodTags?: string[];
	game: {
		id: string;
		code: string;
		title: string;
		backgroundUrl?: string;
		isDlc: boolean;
	};
}
