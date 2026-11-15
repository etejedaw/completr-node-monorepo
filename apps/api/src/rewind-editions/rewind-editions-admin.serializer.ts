import { toIsoDateTime } from "../common/utils/to-iso-date-time.util";
import { isRewindEditionOpenOn } from "./rewind-editions.service";
import { type RewindEditionWithStats } from "./rewind-editions-admin.interface";

export function rewindEditionAdminSerializer(
	{ edition, generatedCount }: RewindEditionWithStats,
	today: Date
) {
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
		inProgress: isRewindEditionOpenOn(edition, today),
		generatedCount
	};
}
