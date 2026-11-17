import { type GamePlatinum } from "../../game-platinum/game-platinum.model";
import { type RewindRunPlatinum } from "../../rewind-recap/rewind-recap.interface";

export function platinumToRewindRunPlatinum(
	platinum: GamePlatinum,
	runId: string
): RewindRunPlatinum {
	return {
		runId,
		platinumedAt: platinum.platinumedAt,
		notes: platinum.notes ?? null
	};
}
