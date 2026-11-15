import { type User } from "../../users/user.model";
import { type SectionAccess } from "../../users/users.types";
import { type RewindViewerAccess } from "../rewind-record.interface";

export function resolveRewindViewerAccess(
	sectionAccess: SectionAccess,
	owner: Pick<User, "rewindIgnoresProfileVisibility">
): RewindViewerAccess {
	const profileGate =
		sectionAccess.profile || owner.rewindIgnoresProfileVisibility;
	return {
		rewind: sectionAccess.rewind && profileGate,
		platinum: sectionAccess.profile && sectionAccess.platinum
	};
}
