import { environmentConfig } from "../../common/config/environment.config";
import { resolveRewindToday } from "./resolve-rewind-today.util";

export function resolveCurrentRewindDay(now: Date = new Date()): Date {
	const override =
		environmentConfig.NODE_ENV === "prod"
			? undefined
			: environmentConfig.REWIND_TODAY;
	return resolveRewindToday(override, now);
}
