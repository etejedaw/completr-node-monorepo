import { toIsoDateTime } from "../common/utils/to-iso-date-time.util";
import { type RewindEditionWithStats } from "./rewind-editions-admin.interface";
import { resolveRewindEditionStatus } from "./utils/resolve-rewind-edition-status.util";

export function rewindEditionAdminSerializer(
	{ edition, generatedCount }: RewindEditionWithStats,
	today: Date
) {
	const status = resolveRewindEditionStatus(edition, today);
	return {
		year: edition.year,
		opensAt: edition.opensAt,
		closesAt: edition.closesAt,
		graceStartsAt: edition.graceStartsAt,
		graceEndsAt: edition.graceEndsAt,
		design: edition.design,
		premiumRegenerations: edition.premiumRegenerations,
		giftRegenerations: edition.giftRegenerations,
		frozenAt: toIsoDateTime(edition.frozenAt),
		status,
		inProgress: status === "open",
		generatedCount
	};
}
