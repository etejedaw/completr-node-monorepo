export interface CoopMember {
	userId: string;
	username: string;
	name: string;
	avatarUrl: string | null;
	backlogId: string;
	status: string;
	startedAt: string | null;
	finishedAt: string | null;
	realDuration: number | null;
}

export interface MembersResponse {
	data: { members: CoopMember[] };
}

export interface AddResponse {
	data: { coopRunId: string; targetBacklogId: string };
}

export interface CoopCandidate {
	id: string;
	status: string;
	startedAt: string | null;
	finishedAt: string | null;
	realDuration: number | null;
	coopRunId: string | null;
}

export interface CandidatesResponse {
	data: {
		accessible: boolean;
		candidates: CoopCandidate[];
	};
}
