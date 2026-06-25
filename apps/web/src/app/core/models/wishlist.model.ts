export interface WishlistEntry {
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
	platform: {
		id: string;
		name: string;
		abbreviation: string;
	} | null;
}
