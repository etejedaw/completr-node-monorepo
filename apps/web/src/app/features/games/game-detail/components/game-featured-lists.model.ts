export interface FeaturedList {
	id: string;
	name: string;
	description?: string;
	isOfficial: boolean;
	completed: boolean;
	owner: { username: string } | null;
}
