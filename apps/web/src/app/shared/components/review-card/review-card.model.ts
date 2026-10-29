export interface ReviewCardReview {
	content?: string | null;
	rating?: number | null;
	playthroughDuration?: number | null;
	createdAt: string;
	game?: {
		code: string;
		title: string;
		coverUrl?: string | null;
		backgroundUrl?: string | null;
	} | null;
	user?: {
		username: string;
		name?: string | null;
		avatarUrl?: string | null;
		role?: string | null;
	} | null;
}
