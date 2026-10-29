import { type RewindAiRecapError } from "../../rewind-errors";

export interface RewindOwnerPanelCopy {
	eyebrow: string;
	onlyYou: string;
	regenerate: string;
	regenerating: string;
	regenerationsLeft: (count: number) => string;
	graceUntil: (date: string) => string;
	includesPrivateRuns: string;
	aiRecapFailed: string;
	retry: string;
	addAiRecap: string;
	addAiRecapHint: string;
	aiRecapPending: string;
	aiRecapErrors: Record<RewindAiRecapError, string>;
	dateLocale: string;
}
