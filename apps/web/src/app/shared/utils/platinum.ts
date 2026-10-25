import { type BacklogEntry } from "../../core/models";

export function isPlatinumRun(entry: BacklogEntry): boolean {
	return !!entry.platinum && entry.platinum.backlogId === entry.id;
}

export function isGamePlatinumed(entry: BacklogEntry): boolean {
	return !!entry.platinum;
}
