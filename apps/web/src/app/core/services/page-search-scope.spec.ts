import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { PageSearchScope } from "./page-search-scope";
import { type PageSearchScopeEntry } from "./page-search-scope.model";

function entry(label: string): PageSearchScopeEntry {
	const value = signal("");
	return {
		label: signal(label),
		placeholder: signal(`Filter ${label}...`),
		ariaLabel: signal(`Filter ${label}`),
		value,
		setValue: next => value.set(next)
	};
}

describe("PageSearchScope", () => {
	let scope: PageSearchScope;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [PageSearchScope] });
		scope = TestBed.inject(PageSearchScope);
	});

	it("starts without an active scope", () => {
		expect(scope.active()).toBeNull();
		expect(scope.hasScope()).toBe(false);
	});

	it("activates the registered scope", () => {
		const games = entry("My Games");

		scope.register(games);

		expect(scope.active()).toBe(games);
		expect(scope.hasScope()).toBe(true);
	});

	it("lets the last registered scope win", () => {
		const games = entry("My Games");
		const queue = entry("Up Next");

		scope.register(games);
		scope.register(queue);

		expect(scope.active()).toBe(queue);
	});

	it("keeps the newer scope when an older one unregisters late", () => {
		const games = entry("My Games");
		const queue = entry("Up Next");
		const unregisterGames = scope.register(games);
		scope.register(queue);

		unregisterGames();

		expect(scope.active()).toBe(queue);
	});

	it("clears the scope when the active one unregisters, even twice", () => {
		const games = entry("My Games");
		const unregister = scope.register(games);

		unregister();
		unregister();

		expect(scope.active()).toBeNull();
		expect(scope.hasScope()).toBe(false);
	});

	it("does not bring back an older scope when the newest unregisters", () => {
		scope.register(entry("My Games"));
		const unregisterQueue = scope.register(entry("Up Next"));

		unregisterQueue();

		expect(scope.active()).toBeNull();
	});
});
