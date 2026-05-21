export interface QueueEntry {
	id: string;
	position: number;
	backlog: QueueBacklog;
}

interface QueueBacklog {
	id: string;
	status: string;
	score?: number;
	duration?: number;
	ratio?: number;
	startedAt?: string;
	notes?: string;
	game: {
		id: string;
		code: string;
		title: string;
		backgroundUrl?: string;
		isDlc: boolean;
	};
	platform?: {
		id: string;
		abbreviation: string;
	};
}
