export function resolveRewindToday(
	todayOverride: string | undefined,
	now: Date
): Date {
	return todayOverride ? new Date(`${todayOverride}T00:00:00.000Z`) : now;
}
