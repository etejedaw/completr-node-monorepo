import { type SearchResults } from "../../core/services/global-search.model";
import {
	type SearchPaletteItem,
	type SearchPaletteScope,
	type SearchPaletteSection
} from "./search-palette.model";

type ResultScope = Exclude<SearchPaletteScope, "all">;

const SCOPED_LIMIT = 10;

const ALL_SCOPE_LIMITS: Record<ResultScope, number> = {
	library: 3,
	games: 5,
	players: 4,
	lists: 4
};

function limitFor(scope: SearchPaletteScope, section: ResultScope) {
	return scope === "all" ? ALL_SCOPE_LIMITS[section] : SCOPED_LIMIT;
}

function libraryItems(
	results: SearchResults,
	scope: SearchPaletteScope,
	query: string
): SearchPaletteItem[] {
	const entries = results.library.entries.slice(
		0,
		limitFor(scope, "library")
	);
	const items: SearchPaletteItem[] = entries.map(entry => ({
		kind: "library",
		id: `library-${entry.id}`,
		path: `/games/${entry.game.code}`,
		entry
	}));
	if (entries.length > 0 && results.library.total > entries.length)
		items.push({
			kind: "library-all",
			id: "library-all",
			path: "/backlog",
			queryParams: { search: query },
			total: results.library.total
		});
	return items;
}

function resultItems(
	section: ResultScope,
	results: SearchResults,
	scope: SearchPaletteScope,
	query: string
): SearchPaletteItem[] {
	const limit = limitFor(scope, section);
	switch (section) {
		case "library":
			return libraryItems(results, scope, query);
		case "games":
			return results.games.slice(0, limit).map(game => ({
				kind: "game",
				id: `game-${game.id}`,
				path: `/games/${game.code}`,
				game
			}));
		case "players":
			return results.users.slice(0, limit).map(user => ({
				kind: "player",
				id: `player-${user.id}`,
				path: `/user/${user.username}`,
				user
			}));
		case "lists":
			return results.lists.slice(0, limit).map(list => ({
				kind: "list",
				id: `list-${list.id}`,
				path: `/lists/${list.id}`,
				list
			}));
	}
}

const RESULT_SECTION_HEADINGS: Record<ResultScope, string> = {
	library: "In your library",
	games: "Games",
	players: "Players",
	lists: "Lists"
};

export function buildResultSections(
	results: SearchResults,
	scope: SearchPaletteScope,
	query: string
): SearchPaletteSection[] {
	const sections = Object.keys(RESULT_SECTION_HEADINGS) as ResultScope[];
	return sections
		.filter(section => scope === "all" || scope === section)
		.map(section => ({
			id: section,
			heading: RESULT_SECTION_HEADINGS[section],
			label: RESULT_SECTION_HEADINGS[section],
			items: resultItems(section, results, scope, query)
		}))
		.filter(section => section.items.length > 0);
}

export function buildCatalogSection(
	scope: SearchPaletteScope,
	query: string
): SearchPaletteSection | null {
	if (scope !== "all" && scope !== "games") return null;
	return {
		id: "catalog",
		heading: null,
		label: "Catalog",
		items: [
			{
				kind: "catalog",
				id: "catalog",
				path: "/games",
				queryParams: { q: query }
			}
		]
	};
}
