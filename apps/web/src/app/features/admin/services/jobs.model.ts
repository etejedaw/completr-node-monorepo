export interface JobEntry {
	id: string;
	type: string;
	status: string;
	result?: string;
	createdAt: string;
	completedAt?: string;
}
