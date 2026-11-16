import {
	REWIND_RECAP_GAME_COLUMNS,
	REWIND_RECAP_NOTES_COLUMN,
	REWIND_RECAP_PLATINUM_NOTES_COLUMN
} from "../rewind-recap.constants";

export function recapGameColumns(includesNotes: boolean): string[] {
	return includesNotes
		? [
				...REWIND_RECAP_GAME_COLUMNS,
				REWIND_RECAP_NOTES_COLUMN,
				REWIND_RECAP_PLATINUM_NOTES_COLUMN
			]
		: [...REWIND_RECAP_GAME_COLUMNS];
}
