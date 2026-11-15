import { REWIND_RECAP_NOTE_MAX_LENGTH } from "../rewind-recap.constants";

const WHITESPACE_RUN = /\s+/g;

export function condenseRecapNote(notes: string | null): string | null {
	if (notes === null) return null;
	const condensed = notes.replace(WHITESPACE_RUN, " ").trim();
	if (condensed === "") return null;
	return [...condensed]
		.slice(0, REWIND_RECAP_NOTE_MAX_LENGTH)
		.join("")
		.trimEnd();
}
