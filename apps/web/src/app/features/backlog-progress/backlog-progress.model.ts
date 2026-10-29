export interface ProgressNote {
	id: string;
	note: string;
	createdAt: string;
}

export interface ProgressResponse {
	data: { progress: ProgressNote[] };
}

export interface ProgressEntryResponse {
	data: { progress: ProgressNote };
}
