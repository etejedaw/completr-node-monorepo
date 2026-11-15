import { REWIND_PERIOD_STATUSES } from "../../../core/models/rewind.model";
import { type UiBadgeTone } from "../../../shared/ui";
import { type RewindEdition } from "../services/rewind-admin.model";

export const REWIND_EDITION_STATUSES = [
	...REWIND_PERIOD_STATUSES,
	"frozen"
] as const;
export type RewindEditionStatus = (typeof REWIND_EDITION_STATUSES)[number];

export interface RewindEditionStatusStyle {
	label: string;
	icon: string;
	tone: UiBadgeTone;
}

export interface RewindEditionRow {
	edition: RewindEdition;
	status: RewindEditionStatus;
}

export type RewindEditionDialogStep = "form" | "confirm";

export type RewindEditionDialogMode =
	{ kind: "create" } | { kind: "edit"; edition: RewindEdition };

export interface RewindEditionFormModel {
	year: string;
	opensAt: string;
	closesAt: string;
	graceStartsAt: string;
	graceEndsAt: string;
	design: string;
	premiumRegenerations: string;
	giftRegenerations: string;
}

export interface RewindEditionSaved {
	edition: RewindEdition;
	affectedRewinds: number | null;
}

export type RewindEditionDateField =
	"opensAt" | "closesAt" | "graceStartsAt" | "graceEndsAt";

export interface RewindEditionFieldErrors {
	year: string | null;
	period: string | null;
	grace: string | null;
	design: string | null;
	premiumRegenerations: string | null;
	giftRegenerations: string | null;
}

export type RewindEditionServerErrorField = "year" | "period";

export interface RewindEditionServerError {
	field: RewindEditionServerErrorField;
	message: string;
	submitted: string;
}
