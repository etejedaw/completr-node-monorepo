import { toIsoDateTime } from "../common/utils/to-iso-date-time.util";
import { type AdminRewindItem } from "./rewind-admin.interface";

export function rewindAdminSerializer(item: AdminRewindItem) {
	return {
		id: item.id,
		year: item.year,
		user: item.user,
		accessKind: item.premiumAccessKind ?? "none",
		regenerationsLeft: item.regenerationsLeft,
		graceUsed: item.graceUsed,
		generatedAt: toIsoDateTime(item.generatedAt),
		frozenAt: toIsoDateTime(item.frozenAt)
	};
}
