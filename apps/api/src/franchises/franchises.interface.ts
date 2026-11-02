export interface TrackedFranchiseEntry {
	franchise: { id: string; name: string; code: string };
	gameCount: number;
}

export interface GameFranchiseRef {
	gameId: string;
	name: string;
}
