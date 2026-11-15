import { type RewindPeriodStatus } from "../../../core/models/rewind.model";

export interface RewindEdition {
	year: number;
	opensAt: string;
	closesAt: string;
	graceStartsAt: string;
	graceEndsAt: string;
	design: string;
	premiumRegenerations: number;
	giftRegenerations: number;
	frozenAt: string | null;
	status: RewindPeriodStatus;
	inProgress: boolean;
	generatedCount: number;
}

export interface RewindEditionsCatalog {
	editions: RewindEdition[];
	designs: string[];
}

export interface RewindEditionSettings {
	opensAt: string;
	closesAt: string;
	graceStartsAt: string;
	graceEndsAt: string;
	design: string;
	premiumRegenerations: number;
	giftRegenerations: number;
}

export interface CreateRewindEditionRequest extends RewindEditionSettings {
	year: number;
}

export interface UpdateRewindEditionRequest extends RewindEditionSettings {
	applyToGenerated?: boolean;
}

export interface UpdateRewindEditionResult {
	edition: RewindEdition;
	affectedRewinds: number;
}

export const ADMIN_REWIND_ACCESS_KINDS = ["none", "gift", "premium"] as const;
export type AdminRewindAccessKind = (typeof ADMIN_REWIND_ACCESS_KINDS)[number];

export interface AdminRewind {
	id: string;
	year: number;
	user: { id: string; username: string };
	accessKind: AdminRewindAccessKind;
	regenerationsLeft: number;
	graceUsed: boolean;
	generatedAt: string;
	frozenAt: string | null;
}

export interface AdminRewindsPage {
	rewinds: AdminRewind[];
	total: number;
}

export interface AdminRewindsQuery {
	year: number;
	search?: string;
	limit: number;
	offset: number;
}
