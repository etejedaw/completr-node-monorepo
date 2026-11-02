export interface Review {
	id: string;
	content?: string;
	rating?: number;
	playthroughDuration?: number | null;
	user: {
		id: string;
		username: string;
		name: string;
		avatarUrl?: string;
	} | null;
	createdAt: string;
	updatedAt: string;
}
