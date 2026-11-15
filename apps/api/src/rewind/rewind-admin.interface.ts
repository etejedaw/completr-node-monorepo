import { type RewindPremiumAccessKind } from "./rewind.constants";

export interface AdminRewindItem {
	id: string;
	year: number;
	user: { id: string; username: string };
	premiumAccessKind: RewindPremiumAccessKind | null;
	regenerationsLeft: number;
	graceUsed: boolean;
	generatedAt: Date;
	frozenAt: Date | null;
}
