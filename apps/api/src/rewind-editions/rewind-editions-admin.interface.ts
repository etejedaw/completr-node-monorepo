import { type RewindEditionRecord } from "./rewind-editions.interface";

export interface RewindEditionWithStats {
	edition: RewindEditionRecord;
	generatedCount: number;
}

export interface RewindEditionUpdateResult {
	edition: RewindEditionRecord;
	generatedCount: number;
	affectedRewinds: number;
}
