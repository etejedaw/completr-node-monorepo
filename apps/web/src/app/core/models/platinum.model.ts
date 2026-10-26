export interface PlatinumEntry {
	id: string;
	backlogId: string | null;
	platformId: string | null;
	platinumedAt: string | null;
	notes?: string | null;
	platform: { id: string; name: string; abbreviation: string } | null;
	game: {
		id: string;
		code: string;
		title: string;
		backgroundUrl?: string;
		isDlc: boolean;
	};
}
