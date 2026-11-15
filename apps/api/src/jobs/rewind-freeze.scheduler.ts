import { Cron } from "croner";

import { PinoLogger } from "../common/logger/pino.logger";
import { describeFailure } from "../common/utils/describe-failure.util";
import * as rewindFreezeService from "../rewind/services/rewind-freeze.service";
import {
	REWIND_FREEZE_SCHEDULE,
	REWIND_FREEZE_SCHEDULER_NAME
} from "./jobs.constants";
import { describeRewindFreezeReport } from "./utils/describe-rewind-freeze-report.util";

const logger = new PinoLogger("Rewind Freeze Scheduler");

export async function runScheduledRewindFreeze(): Promise<void> {
	try {
		const report = await rewindFreezeService.freezeClosedRewindEditions();
		if (report.closedEditions.length === 0 && report.locked) return;
		const summary = describeRewindFreezeReport(report);
		if (report.failed > 0) logger.warn("freeze", summary);
		else logger.info("freeze", summary);
	} catch (error) {
		logger.error("freeze", "failed", { error: describeFailure(error) });
	}
}

export function startRewindFreezeScheduler(): Cron {
	const scheduler = new Cron(
		REWIND_FREEZE_SCHEDULE,
		{ name: REWIND_FREEZE_SCHEDULER_NAME, protect: true },
		runScheduledRewindFreeze
	);
	void scheduler.trigger();
	return scheduler;
}
