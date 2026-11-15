export interface LatestProgress {
	note: string;
	createdAt: Date;
}

export interface LatestProgressRow extends LatestProgress {
	backlogId: string;
}
