import { type RewindEditionRecord } from "../../rewind-editions/rewind-editions.interface";
import { type RewindPremiumAccessKind } from "../rewind.constants";
import {
	type RewindAiBudget,
	type RewindQuotaAssignment
} from "../rewind-generation.interface";
import {
	type RewindAiBudgetRecord,
	type RewindAiSpend
} from "../rewind-generation.types";
import { type RewindCalendar } from "../rewind-run.interface";
import { isRewindGraceWindow } from "./is-rewind-grace-window.util";
import { isRewindYearAllowed } from "./is-rewind-year-allowed.util";
import { resolveOpenRewindEdition } from "./resolve-open-rewind-edition.util";
import { resolveRegenerationQuota } from "./resolve-regeneration-quota.util";

function pendingAssignment(
	record: RewindAiBudgetRecord,
	edition: RewindEditionRecord | null,
	accessKind: RewindPremiumAccessKind | null
): RewindQuotaAssignment | null {
	if (!edition || !accessKind || record.premiumAccessKind !== null)
		return null;
	return {
		premiumAccessKind: accessKind,
		regenerationsLeft: resolveRegenerationQuota(edition, accessKind)
	};
}

function chooseSpend(
	canUseAi: boolean,
	graceEndsAt: string | null,
	regenerationsLeft: number
): RewindAiSpend | null {
	if (!canUseAi) return null;
	if (graceEndsAt !== null) return "grace";
	return regenerationsLeft > 0 ? "regeneration" : null;
}

export function resolveRewindAiBudget(
	record: RewindAiBudgetRecord,
	calendar: Pick<RewindCalendar, "today" | "edition">,
	accessKind: RewindPremiumAccessKind | null
): RewindAiBudget {
	const edition = resolveOpenRewindEdition(calendar);
	const yearAllowed =
		edition !== null &&
		isRewindYearAllowed(record.year, edition, accessKind);
	const hasAiAccess = accessKind !== null;
	const canUseAi = yearAllowed && hasAiAccess;
	const assignment = pendingAssignment(record, edition, accessKind);
	const regenerationsLeft =
		record.regenerationsLeft + (assignment?.regenerationsLeft ?? 0);
	const graceEndsAt =
		edition &&
		canUseAi &&
		!record.graceUsed &&
		isRewindGraceWindow(record.year, calendar)
			? edition.graceEndsAt
			: null;

	return {
		edition,
		yearAllowed,
		hasAiAccess,
		graceEndsAt,
		regenerationsLeft,
		assignment,
		spend: chooseSpend(canUseAi, graceEndsAt, regenerationsLeft)
	};
}
