import { type CoopMemberSummary } from "../backlog/backlog.interface";

export interface CoopMemberDetail extends CoopMemberSummary {
	status: string;
	startedAt: Date | null;
	finishedAt: Date | null;
	realDuration: number | null;
}

export interface CoopCandidate {
	id: string;
	status: string;
	startedAt: Date | null;
	finishedAt: Date | null;
	realDuration: number | null;
	coopRunId: string | null;
}

export interface CoopCandidatesResult {
	accessible: boolean;
	candidates: CoopCandidate[];
}
