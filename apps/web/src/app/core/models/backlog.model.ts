export interface BacklogEntry {
	id: string;
	status: BacklogStatus;
	score?: number;
	duration?: number;
	ratio?: number;
	personalRatio?: number;
	startedAt?: string;
	finishedAt?: string;
	realDuration?: number;
	userRating?: number;
	isPublic: boolean;
	notes?: string;
	hasReview?: boolean;
	reviewContent?: string | null;
	review?: { content: string | null; rating: number | null } | null;
	moodTags?: string[];
	latestProgress?: { note: string; createdAt: string } | null;
	coopRunId?: string | null;
	coopMembers?: BacklogCoopMember[];
	game: BacklogGame;
	platform: BacklogPlatform;
	compilationGame?: BacklogCompilationGame | null;
}

export interface BacklogCompilationGame {
	id: string;
	code: string;
	title: string;
	backgroundUrl?: string;
}

export type BacklogStatus =
	"not_started" | "playing" | "completed" | "abandoned" | "endless";

interface BacklogGame {
	id: string;
	code: string;
	title: string;
	backgroundUrl?: string;
	isDlc: boolean;
}

interface BacklogPlatform {
	id: string;
	abbreviation: string;
}

export interface BacklogCoopMember {
	userId: string;
	username: string;
	name: string;
	avatarUrl: string | null;
	backlogId: string;
}
