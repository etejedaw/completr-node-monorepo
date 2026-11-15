import { type ProfileAccessError } from "../components/profile-access-state";

const FORBIDDEN_STATUS = 403;
const NOT_FOUND_STATUS = 404;

interface StatusCarrier {
	status?: number;
	cause?: StatusCarrier;
}

export function errorStatusOf(error: unknown): number | null {
	if (!error) return null;
	const carrier = error as StatusCarrier;
	return carrier.status ?? carrier.cause?.status ?? 0;
}

export function profileAccessErrorOf(
	error: unknown
): ProfileAccessError | null {
	const status = errorStatusOf(error);
	if (status === FORBIDDEN_STATUS) return "private";
	if (status === NOT_FOUND_STATUS) return "not_found";
	return null;
}

export function hasLoadFailedOf(error: unknown): boolean {
	return (
		errorStatusOf(error) !== null && profileAccessErrorOf(error) === null
	);
}
