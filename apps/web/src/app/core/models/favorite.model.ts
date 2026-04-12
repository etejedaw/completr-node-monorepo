export interface FavoriteEntry {
	id: string;
	position: number;
	game: {
		id: string;
		code: string;
		title: string;
		backgroundUrl?: string;
		isDlc: boolean;
	};
}
