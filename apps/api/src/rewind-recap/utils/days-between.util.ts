import { MS_PER_DAY } from "../rewind-recap.constants";

export function daysBetween(from: string, to: string): number {
	return Math.round((Date.parse(to) - Date.parse(from)) / MS_PER_DAY);
}
