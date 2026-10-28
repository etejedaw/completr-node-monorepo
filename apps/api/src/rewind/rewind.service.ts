import * as backlogService from "../backlog/backlog.service";
import { environmentConfig } from "../common/config/environment.config";
import * as gameGenreService from "../game-genre/game-genre.service";
import * as gamePlatinumService from "../game-platinum/game-platinum.service";
import {
	resolveSectionAccess,
	type SectionAccess
} from "../users/helpers/visibility.helper";
import { type User } from "../users/user.model";
import * as usersService from "../users/users.service";
import * as rewindServiceError from "./errors/rewind.service-error";
import { backlogToRewindRun } from "./mappers/backlog-to-rewind-run.mapper";
import { userToRewindOwner } from "./mappers/user-to-rewind-owner.mapper";
import { type Rewind, type RewindYears } from "./rewind.interface";
import { type RewindCalendar, type RewindRun } from "./rewind-run.interface";
import { buildRewind } from "./utils/build-rewind.util";
import { buildRewindYears } from "./utils/build-rewind-years.util";
import { collectYearRuns } from "./utils/collect-year-runs.util";
import { listRewindYears } from "./utils/list-rewind-years.util";
import { resolveRewindToday } from "./utils/resolve-rewind-today.util";

interface RewindViewerContext {
	owner: User;
	access: SectionAccess;
	runs: RewindRun[];
	calendar: RewindCalendar;
}

function rewindTodayOverride(): string | undefined {
	return environmentConfig.NODE_ENV === "prod"
		? undefined
		: environmentConfig.REWIND_TODAY;
}

function buildRewindCalendar(owner: User): RewindCalendar {
	return {
		today: resolveRewindToday(rewindTodayOverride(), new Date()),
		firstYear: owner.createdAt.getUTCFullYear()
	};
}

async function requireRewindOwner(username: string): Promise<User> {
	const owner = await usersService.findUserByUsername(username);
	if (!owner) throw rewindServiceError.userNotFoundError();
	return owner;
}

async function loadViewerContext(
	viewerId: string | undefined,
	username: string
): Promise<RewindViewerContext> {
	const owner = await requireRewindOwner(username);
	const access = await resolveSectionAccess(viewerId, owner);
	if (!access.profile || !access.rewind)
		throw rewindServiceError.userPrivateError();

	const isOwner = viewerId === owner.id;
	const runs = await backlogService.findDatedRunsByUserId(owner.id, {
		publicOnly: !isOwner
	});
	return {
		owner,
		access,
		runs: runs.map(backlogToRewindRun),
		calendar: buildRewindCalendar(owner)
	};
}

function countVisiblePlatinums(
	context: RewindViewerContext,
	year: number
): Promise<number | null> {
	if (!context.access.platinum) return Promise.resolve(null);
	return gamePlatinumService.countPlatinumsByUserIdAndYear(
		context.owner.id,
		year
	);
}

function listFinishedGameIds(runs: RewindRun[], years: number[]): string[] {
	const gameIds = years.flatMap(year =>
		collectYearRuns(runs, year).finished.map(run => run.gameId)
	);
	return [...new Set(gameIds)];
}

export async function getRewindYearsForViewer(
	viewerId: string | undefined,
	username: string
): Promise<RewindYears> {
	const context = await loadViewerContext(viewerId, username);
	const years = listRewindYears(context.runs, context.calendar);
	const [genres, platinumCounts] = await Promise.all([
		gameGenreService.findGenresByGameIds(
			listFinishedGameIds(context.runs, years)
		),
		Promise.all(years.map(year => countVisiblePlatinums(context, year)))
	]);

	return buildRewindYears({
		runs: context.runs,
		genres,
		platinumsByYear: new Map(
			years.map((year, index) => [year, platinumCounts[index] ?? null])
		),
		calendar: context.calendar
	});
}

export async function getRewindForViewer(
	viewerId: string | undefined,
	username: string,
	year: number
): Promise<Rewind> {
	const context = await loadViewerContext(viewerId, username);
	if (!listRewindYears(context.runs, context.calendar).includes(year))
		throw rewindServiceError.notFoundError();

	const [genres, platinums] = await Promise.all([
		gameGenreService.findGenresByGameIds(
			listFinishedGameIds(context.runs, [year])
		),
		countVisiblePlatinums(context, year)
	]);

	return buildRewind({
		year,
		owner: userToRewindOwner(context.owner),
		runs: context.runs,
		genres,
		platinums,
		calendar: context.calendar
	});
}
