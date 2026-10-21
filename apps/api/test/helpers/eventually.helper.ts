import { setTimeout as delay } from "node:timers/promises";

const POLL_INTERVAL_MS = 20;
const TIMEOUT_MS = 2_000;

export async function eventually<T>(check: () => Promise<T>): Promise<T> {
	const deadline = Date.now() + TIMEOUT_MS;
	for (;;) {
		try {
			return await check();
		} catch (error) {
			if (Date.now() >= deadline) throw error;
			await delay(POLL_INTERVAL_MS);
		}
	}
}
