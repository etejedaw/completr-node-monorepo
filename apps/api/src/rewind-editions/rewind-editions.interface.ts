export interface RewindEditionRecord {
	year: number;
	opensAt: string;
	closesAt: string;
	graceStartsAt: string;
	graceEndsAt: string;
	design: string;
	premiumRegenerations: number;
	giftRegenerations: number;
	frozenAt: Date | null;
}
