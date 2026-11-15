import { type RewindLanguage } from "../../core/models/rewind.model";
import { toUtcDate } from "../../shared/utils/iso-date";
import { rewindCopy } from "./rewind-copy";

function dayFormat(language: RewindLanguage, withYear: boolean) {
	const { locale, dayMonthStyle } = rewindCopy(language);
	return new Intl.DateTimeFormat(locale, {
		...(withYear ? { year: "numeric" } : {}),
		month: dayMonthStyle,
		day: "numeric",
		timeZone: "UTC"
	});
}

export function formatRewindDay(
	isoDateOrDateTime: string,
	language: RewindLanguage
): string {
	return dayFormat(language, false).format(toUtcDate(isoDateOrDateTime));
}

export function formatRewindDayWithYear(
	isoDateOrDateTime: string,
	language: RewindLanguage
): string {
	return dayFormat(language, true).format(toUtcDate(isoDateOrDateTime));
}
