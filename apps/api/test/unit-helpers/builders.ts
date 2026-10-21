import { type Backlog } from "../../src/backlog/backlog.model";
import { type Game } from "../../src/games/game.model";
import { type Platform } from "../../src/platforms/platform.model";
import { asModel } from "./as-model";

export function buildGame(overrides: Record<string, unknown> = {}) {
	return asModel<Game>({
		id: "game-1",
		code: "hollow-knight",
		title: "Hollow Knight",
		backgroundUrl: "https://img/bg.jpg",
		coverUrl: "https://img/cover.jpg",
		isDlc: false,
		...overrides
	});
}

export function buildPlatform(overrides: Record<string, unknown> = {}) {
	return asModel<Platform>({
		id: "platform-1",
		name: "PC",
		code: "pc",
		abbreviation: "PC",
		generation: 9,
		logoUrl: null,
		releaseAt: null,
		...overrides
	});
}

export function buildBacklog(overrides: Record<string, unknown> = {}) {
	return asModel<Backlog>({
		id: "backlog-1",
		status: "completed",
		score: 4,
		duration: 20,
		realDuration: 10,
		startedAt: "2024-01-01",
		finishedAt: "2024-02-01",
		userRating: 4.5,
		isPublic: true,
		notes: "private notes",
		coopRunId: null,
		Game: buildGame(),
		Platform: buildPlatform(),
		CompilationGame: null,
		...overrides
	});
}
