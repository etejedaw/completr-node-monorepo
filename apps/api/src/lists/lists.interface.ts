export interface ListSerializerOptions {
	followerCount?: number;
	isFollowing?: boolean;
	backlogSummaryMap?: Map<string, BacklogSummary>;
	progress?: { completed: number; total: number } | null;
}

export interface ListProgress {
	completed: number;
	total: number;
}

export interface BacklogSummary {
	status: string;
	realDuration: number | null;
	personalRatio: number | null;
}
