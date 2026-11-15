export const ISO_YEAR_LENGTH = 4;
export const ISO_DAY_LENGTH = 10;
export const ISO_MINUTE_LENGTH = 16;

export function toUtcDate(isoDateOrDateTime: string): Date {
	return new Date(
		isoDateOrDateTime.length > ISO_DAY_LENGTH
			? isoDateOrDateTime
			: `${isoDateOrDateTime}T00:00:00Z`
	);
}
