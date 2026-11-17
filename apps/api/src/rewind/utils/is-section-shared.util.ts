import { type VisibilityLevel } from "../../users/constants/visibility.constants";

export function isSectionShared(
	visibility: VisibilityLevel,
	includesPrivateRuns: boolean
): boolean {
	return includesPrivateRuns || visibility === "public";
}
