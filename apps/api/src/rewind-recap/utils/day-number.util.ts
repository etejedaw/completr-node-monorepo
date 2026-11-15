import { MS_PER_DAY } from "../rewind-recap.constants";

export function dayNumber(date: string): number {
	return Math.round(Date.parse(date) / MS_PER_DAY);
}
