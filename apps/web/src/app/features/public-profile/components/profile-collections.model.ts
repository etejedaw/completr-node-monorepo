export interface CollectionGame {
	id: string;
	game: {
		code: string;
		title: string;
		coverUrl?: string;
		backgroundUrl?: string;
	};
	badge?: string;
}
