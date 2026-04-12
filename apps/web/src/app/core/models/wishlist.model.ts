export interface WishlistEntry {
	id: string;
	position: number;
	backlog: WishlistBacklog;
}

interface WishlistBacklog {
	id: string;
	status: string;
	score?: number;
	duration?: number;
	ratio?: number;
	startedAt?: string;
	notes?: string;
	game: {
		id: string;
		code: string;
		title: string;
		backgroundUrl?: string;
		isDlc: boolean;
	};
	platform?: {
		id: string;
		abbreviation: string;
	};
}
