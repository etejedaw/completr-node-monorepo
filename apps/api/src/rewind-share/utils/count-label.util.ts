import { type ShareCountLabel } from "../rewind-share.interface";

export function countLabel(count: number, label: ShareCountLabel): string {
	return count === 1 ? label.one : label.other;
}
