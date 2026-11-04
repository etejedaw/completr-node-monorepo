import { setTimeout as sleep } from "node:timers/promises";

import {
	type ExternalDataRequestPacer,
	type RequestPacerClock
} from "../games-external-data.interface";

const SYSTEM_CLOCK: RequestPacerClock = {
	now: () => Date.now(),
	sleep: (milliseconds, signal) => sleep(milliseconds, undefined, { signal })
};

export function createRequestPacer(
	minIntervalMs: number,
	clock: RequestPacerClock = SYSTEM_CLOCK
): ExternalDataRequestPacer {
	let nextTurnAt = Number.NEGATIVE_INFINITY;

	return {
		async waitForTurn(signal) {
			signal?.throwIfAborted();
			const now = clock.now();
			const turnAt = Math.max(now, nextTurnAt);
			nextTurnAt = turnAt + minIntervalMs;
			if (turnAt > now) await clock.sleep(turnAt - now, signal);
		}
	};
}
