export interface CollectionGame {
	id: string;
	game: { code: string; title: string; backgroundUrl?: string };
	badge?: string;
}
