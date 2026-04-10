export interface FavoriteEntry {
	id: string;
	position: number;
	game: {
		id: string;
		title: string;
		backgroundUrl?: string;
		isDlc: boolean;
	};
}
