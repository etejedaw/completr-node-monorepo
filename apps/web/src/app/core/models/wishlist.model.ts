export interface WishlistEntry {
	id: string;
	position: number;
	game: {
		id: string;
		code: string;
		title: string;
		backgroundUrl?: string;
		isDlc: boolean;
	};
	platform: {
		id: string;
		name: string;
		abbreviation: string;
	} | null;
}
