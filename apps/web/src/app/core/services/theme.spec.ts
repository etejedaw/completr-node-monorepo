import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../environments/environment";
import { applyInitialTheme, THEME_CATALOG, ThemeService } from "./theme";

const STORAGE_KEY = "completr.theme";

describe("ThemeService", () => {
	let theme: ThemeService;
	let httpTesting: HttpTestingController;
	let meta: HTMLMetaElement;

	beforeEach(() => {
		localStorage.clear();
		document.documentElement.removeAttribute("data-theme");
		meta = document.createElement("meta");
		meta.name = "theme-color";
		meta.content = "#000000";
		document.head.appendChild(meta);
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		theme = TestBed.inject(ThemeService);
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpTesting.verify();
		meta.remove();
	});

	it("exposes the catalog", () => {
		expect(theme.catalog).toBe(THEME_CATALOG);
	});

	it("defaults to refined-dark when nothing is stored", () => {
		expect(theme.currentId()).toBe("refined-dark");
		expect(theme.current().id).toBe("refined-dark");
	});

	it("returns the stored theme", () => {
		localStorage.setItem(STORAGE_KEY, "midnight-cyan");

		expect(theme.currentId()).toBe("midnight-cyan");
		expect(theme.current().name).toBe("Midnight Cyan");
	});

	it("ignores a stored theme that is not in the catalog", () => {
		localStorage.setItem(STORAGE_KEY, "nope");

		expect(theme.currentId()).toBe("refined-dark");
	});

	it("applies a theme to the document and the theme-color meta", () => {
		theme.apply("twilight-arcade");

		expect(document.documentElement.getAttribute("data-theme")).toBe(
			"twilight-arcade"
		);
		expect(meta.content).toBe("#181028");
	});

	it.each([null, undefined, "nope" as never])(
		"applies the default theme for %s",
		id => {
			theme.apply(id);

			expect(document.documentElement.getAttribute("data-theme")).toBe(
				"refined-dark"
			);
			expect(meta.content).toBe("#0a0a0c");
		}
	);

	it("stores and applies a local theme", () => {
		theme.setLocal("midnight-cyan");

		expect(localStorage.getItem(STORAGE_KEY)).toBe("midnight-cyan");
		expect(document.documentElement.getAttribute("data-theme")).toBe(
			"midnight-cyan"
		);
	});

	it("ignores an unknown local theme", () => {
		theme.setLocal("nope" as never);

		expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
		expect(document.documentElement.getAttribute("data-theme")).toBeNull();
	});

	it("still applies the theme when storage fails", () => {
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new Error("quota");
		});

		theme.setLocal("midnight-cyan");

		expect(document.documentElement.getAttribute("data-theme")).toBe(
			"midnight-cyan"
		);
		vi.restoreAllMocks();
	});

	it("persists the theme locally and patches the user", () => {
		let result: unknown;
		theme
			.persist("twilight-arcade")
			.subscribe(response => (result = response));

		const req = httpTesting.expectOne(`${environment.apiUrl}/users/me`);
		expect(req.request.method).toBe("PATCH");
		expect(req.request.body).toEqual({ theme: "twilight-arcade" });
		req.flush({ data: { user: { theme: "twilight-arcade" } } });

		expect(result).toEqual({
			data: { user: { theme: "twilight-arcade" } }
		});
		expect(localStorage.getItem(STORAGE_KEY)).toBe("twilight-arcade");
	});
});

describe("applyInitialTheme", () => {
	beforeEach(() => {
		localStorage.clear();
		document.documentElement.removeAttribute("data-theme");
	});

	it("applies the stored theme", () => {
		localStorage.setItem(STORAGE_KEY, "twilight-arcade");

		applyInitialTheme();

		expect(document.documentElement.getAttribute("data-theme")).toBe(
			"twilight-arcade"
		);
	});

	it("applies the default theme when the stored one is unknown", () => {
		localStorage.setItem(STORAGE_KEY, "nope");

		applyInitialTheme();

		expect(document.documentElement.getAttribute("data-theme")).toBe(
			"refined-dark"
		);
	});
});
