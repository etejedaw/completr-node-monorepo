export interface IncomingFollowRequest {
	requesterId: string;
	createdAt: string;
	user: {
		id: string;
		username: string;
		name: string;
		avatarUrl?: string;
		role?: string;
	};
}
