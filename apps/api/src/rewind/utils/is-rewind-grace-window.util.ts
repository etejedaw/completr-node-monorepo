import { REWIND_GRACE_LAST_DAY } from "../rewind.constants";

export function isRewindGraceWindow(year: number, today: Date): boolean {
	return (
		today.getUTCFullYear() === year + 1 &&
		today.getUTCMonth() === 0 &&
		today.getUTCDate() <= REWIND_GRACE_LAST_DAY
	);
}
