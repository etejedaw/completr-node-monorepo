import { parseArgs } from "node:util";

import z from "zod";

import { PinoLogger } from "../src/common/logger/pino.logger";
import { initDatabase } from "../src/database/init.database";
import { sequelize } from "../src/database/sequelize.database";
import {
	type ClosedEditionRewindOutcome,
	type ClosedEditionRewindRefusal
} from "../src/rewind/rewind-closed-edition.types";
import { generateClosedEditionRewind } from "../src/rewind/services/rewind-closed-edition.service";

const logger = new PinoLogger("generate-closed-rewind");

const REFUSAL_MESSAGES: Record<ClosedEditionRewindRefusal, string> = {
	"user-missing": "No active user has that username.",
	"rewind-missing":
		'The user has no row in "Rewinds" for that year. Insert it first.',
	"edition-missing": "No Rewind edition exists for that year.",
	"edition-not-closed":
		"The edition of that year is still open or upcoming. This tool only works on closed editions.",
	"already-frozen":
		"That Rewind is already frozen. Pass --force to rebuild and refreeze it.",
	"recap-in-progress":
		"An AI recap is being written for that Rewind right now. Try again in a few minutes."
};

const ArgsSchema = z.object({
	user: z.string().trim().min(1),
	year: z.coerce.number().int().min(2000).max(2100),
	force: z.boolean(),
	skipAi: z.boolean()
});

function readArgs() {
	const { values } = parseArgs({
		options: {
			user: { type: "string" },
			year: { type: "string" },
			force: { type: "boolean", default: false },
			"skip-ai": { type: "boolean", default: false }
		}
	});
	return ArgsSchema.parse({
		user: values.user,
		year: values.year,
		force: values.force,
		skipAi: values["skip-ai"]
	});
}

function reportOutcome(
	username: string,
	year: number,
	outcome: ClosedEditionRewindOutcome
): boolean {
	if (outcome.kind === "refused") {
		logger.error("generate", "refused", {
			username,
			year,
			reason: REFUSAL_MESSAGES[outcome.reason]
		});
		return false;
	}
	if (outcome.kind === "ai-failed") {
		logger.error("generate", "ai failed", {
			username,
			year,
			reason: "The AI recap failed and the Rewind was not frozen. Run it again, or pass --skip-ai to freeze it without a recap."
		});
		return false;
	}
	if (outcome.kind === "not-frozen") {
		logger.error("generate", "not frozen", {
			username,
			year,
			ai: outcome.aiRecapReady ? "ok" : "failed",
			freeze: outcome.freeze,
			reason: "The Rewind changed while it was being frozen. Run it again with --force."
		});
		return false;
	}
	logger.info("generate", "ok", {
		username,
		year,
		design: outcome.design,
		ai: outcome.aiRecapReady ? "ok" : "failed",
		frozenAt: outcome.frozenAt.toISOString()
	});
	return true;
}

async function main() {
	const args = readArgs();
	await initDatabase();
	const outcome = await generateClosedEditionRewind({
		username: args.user,
		year: args.year,
		force: args.force,
		skipAi: args.skipAi
	});
	const succeeded = reportOutcome(args.user, args.year, outcome);
	await sequelize.close();
	if (!succeeded) process.exitCode = 1;
}

void main().catch(error => {
	logger.error("generate", "failed", {
		error: error instanceof Error ? error.message : String(error)
	});
	process.exit(1);
});
