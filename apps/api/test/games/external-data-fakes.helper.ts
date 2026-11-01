import { randomUUID } from "node:crypto";

import { ServiceError } from "../../src/common/errors/service-error";
import { GameExternal } from "../../src/game-external/game-external.model";
import { type ExternalSource } from "../../src/game-external/game-external.model";
import { Game } from "../../src/games/game.model";
import {
	type HltbSourceDetail,
	type MetacriticSourceDetail
} from "../../src/games/games-external-data.interface";
import { registerExternalDataSources } from "../../src/games/services/external-data-sources.service";

type FakeOutcome<T> = T | Error | Promise<T>;

export function providerError(code: string) {
	return new ServiceError(code, {
		service: code.startsWith("HLTB")
			? "HLTB Provider"
			: "Metacritic Provider",
		raw: undefined
	});
}

export function metacriticDetail(
	overrides: Partial<MetacriticSourceDetail> & { slug: string; title: string }
): MetacriticSourceDetail {
	return {
		releaseYear: null,
		platforms: ["PC"],
		metaScore: null,
		userScore: null,
		...overrides
	};
}

export function hltbDetail(
	overrides: Partial<HltbSourceDetail> & { id: string }
): HltbSourceDetail {
	return {
		title: "Fake HLTB Game",
		releaseYear: null,
		mainStoryHours: null,
		mainExtrasHours: 40,
		completionistHours: 90,
		...overrides
	};
}

async function settle<T>(
	outcome: FakeOutcome<T> | undefined,
	notFound: string
) {
	if (outcome === undefined) throw providerError(notFound);
	if (outcome instanceof Error) throw outcome;
	return outcome;
}

export function fakeMetacritic(
	respond: (slug: string) => FakeOutcome<MetacriticSourceDetail> | undefined
) {
	const calls: string[] = [];
	const source = {
		getGameBySlug(slug: string) {
			calls.push(slug);
			return settle(respond(slug), "METACRITIC_NOT_FOUND");
		}
	};
	return { calls, source };
}

export function fakeHltb(
	respond: (id: string) => FakeOutcome<HltbSourceDetail> | undefined
) {
	const calls: string[] = [];
	const source = {
		getGameById(id: string) {
			calls.push(id);
			return settle(respond(id), "HLTB_NOT_FOUND");
		}
	};
	return { calls, source };
}

export function metacriticPages(pages: MetacriticSourceDetail[]) {
	return fakeMetacritic(slug => pages.find(page => page.slug === slug));
}

export function hltbPages(pages: HltbSourceDetail[]) {
	return fakeHltb(id => pages.find(page => page.id === id));
}

export function registerFakes(fakes: {
	metacritic?: ReturnType<typeof fakeMetacritic>;
	hltb?: ReturnType<typeof fakeHltb>;
}) {
	registerExternalDataSources({
		metacritic: fakes.metacritic?.source,
		hltb: fakes.hltb?.source
	});
}

export function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>(done => {
		resolve = done;
	});
	return { promise, resolve };
}

export function createCatalogGame(
	title: string,
	overrides: {
		variant?: string | null;
		releaseAt?: string | null;
		isActive?: boolean;
	} = {}
) {
	return Game.create({
		title,
		code: `game-${randomUUID().slice(0, 12)}`,
		variant: overrides.variant ?? null,
		releaseAt: overrides.releaseAt ?? null,
		isActive: overrides.isActive ?? true
	});
}

export function linkExternal(
	gameId: string,
	source: ExternalSource,
	externalId: string
) {
	return GameExternal.create({ gameId, source, externalId });
}
