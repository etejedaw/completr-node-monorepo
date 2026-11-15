import { type SectionAccess } from "../../users/users.types";
import { type RewindViewerAccess } from "../rewind-record.interface";
import { type RewindEntryPoint } from "../rewind-record.types";

export function resolveRewindViewerAccess(
	sectionAccess: SectionAccess,
	entryPoint: RewindEntryPoint
): RewindViewerAccess {
	const profileGate = entryPoint === "link" || sectionAccess.profile;
	return {
		rewind: sectionAccess.rewind && profileGate,
		platinum: sectionAccess.profile && sectionAccess.platinum
	};
}
