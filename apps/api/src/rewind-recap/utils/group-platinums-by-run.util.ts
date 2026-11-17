import { type RewindRunPlatinum } from "../rewind-recap.interface";

export function groupPlatinumsByRun(
	platinums: RewindRunPlatinum[] | null
): Map<string, RewindRunPlatinum> | null {
	if (platinums === null) return null;
	return new Map(platinums.map(platinum => [platinum.runId, platinum]));
}
