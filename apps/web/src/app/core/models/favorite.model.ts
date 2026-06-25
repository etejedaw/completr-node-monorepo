export interface FavoriteEntry {
	id: string;
	position: number;
	moodTags?: string[];
	game: {
		id: string;
		code: string;
		title: string;
		backgroundUrl?: string;
		isDlc: boolean;
	};
}
