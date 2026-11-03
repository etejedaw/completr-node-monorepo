import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { render, screen, within } from "@testing-library/angular";

import { AuthService } from "../../core/services/auth";
import { VISIBILITY_OPTIONS } from "../settings/settings-privacy/privacy-options";
import { HelpPage } from "./help-page";

describe("HelpPage", () => {
	const username = signal<string | undefined>(undefined);

	async function renderHelp() {
		const result = await render(HelpPage, {
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				provideRouter([]),
				{
					provide: AuthService,
					useValue: {
						user: () =>
							username() ? { username: username() } : null
					}
				}
			]
		});
		TestBed.inject(HttpTestingController)
			.match(() => true)
			.forEach(request => request.flush({ data: [] }));
		return result;
	}

	beforeEach(() => {
		username.set(undefined);
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: false,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}))
		);
	});

	afterEach(() => vi.unstubAllGlobals());

	it("explains every backlog status with the shared status badge", async () => {
		const { container } = await renderHelp();

		const labels = Array.from(
			container.querySelectorAll(
				"#statuses app-backlog-status-badge ui-badge"
			)
		).map(badge => badge.textContent?.replace(/\s+/g, " ").trim());

		expect(labels).toHaveLength(5);
		expect(labels.join(" ")).toContain("Completed");
		expect(labels.join(" ")).toContain("Playing");
	});

	it("lists Rewind in the table of contents between Saved Views and Privacy", async () => {
		await renderHelp();

		const toc = screen.getAllByRole("navigation", {
			name: "Guide sections"
		})[0];
		const labels = within(toc)
			.getAllByRole("link")
			.map(link => link.textContent?.replace(/^\d+\s*/, "").trim());

		expect(labels).toContain("Rewind");
		expect(labels.indexOf("Rewind")).toBe(
			labels.indexOf("Saved Views") + 1
		);
		expect(labels.indexOf("Privacy")).toBe(labels.indexOf("Rewind") + 1);
	});

	it("numbers the Rewind and Privacy eyebrows 07 and 08", async () => {
		await renderHelp();

		expect(screen.getByText("07 · Rewind")).toBeInTheDocument();
		expect(screen.getByText("08 · Privacy")).toBeInTheDocument();
	});

	it("explains the Rewind rules the code enforces", async () => {
		await renderHelp();

		const section = document.getElementById("rewind")!;
		const text = section.textContent ?? "";

		expect(text).toContain("1 December");
		expect(text).toContain("31 January");
		expect(text).toContain("1 to 7 January");
		expect(text).toContain("English or Spanish");
		expect(text).toContain("Generate your Rewind");
	});

	it("links to the user's own Rewind archive when signed in", async () => {
		username.set("ada");
		await renderHelp();

		expect(
			screen.getByRole("link", { name: /Open my Rewinds/ })
		).toHaveAttribute("href", "/user/ada/rewind");
	});

	it("falls back to the profile when the username is not known", async () => {
		await renderHelp();

		expect(
			screen.getByRole("link", { name: /Open my Rewinds/ })
		).toHaveAttribute("href", "/profile");
	});

	it("shows a Platinums card in the Collection grid linking to /platinums", async () => {
		await renderHelp();

		const collection = document.getElementById("collection")!;
		const card = within(collection).getByRole("link", {
			name: /Platinums/
		});

		expect(card).toHaveAttribute("href", "/platinums");
		expect(card).toHaveTextContent("one platinum per game");
		expect(card).toHaveTextContent("Edit run");
	});

	it("describes Sagas as a Discover page without personal progress", async () => {
		await renderHelp();

		const collection = document.getElementById("collection")!;
		const card = within(collection).getByRole("link", { name: /Sagas/ });

		expect(card).toHaveAttribute("href", "/franchises");
		expect(card).toHaveTextContent("Discover");
		expect(card.textContent).not.toMatch(/progress/i);
	});

	it("notes that collections export as CSV and JSON is premium", async () => {
		await renderHelp();

		const collection = document.getElementById("collection")!;
		const note = within(collection).getByText(/downloaded as CSV/);

		for (const name of [
			"My Games",
			"Up Next",
			"My Shelf",
			"Want to Get",
			"Favorites",
			"Platinums"
		])
			expect(note).toHaveTextContent(name);
		expect(note).toHaveTextContent(
			"Export menu at the end of their toolbar"
		);
		expect(note).toHaveTextContent("your own lists from their ⋯ menu");
		expect(note).toHaveTextContent("JSON is a Premium perk");
	});

	it("names Platinums, Sagas and Rewind in the privacy sections", async () => {
		await renderHelp();

		const privacy = document.getElementById("privacy")!;
		const sentence = within(privacy).getByText(/fine-tune each section/);

		for (const name of ["Platinums", "Sagas", "Rewind"])
			expect(sentence).toHaveTextContent(name);
	});

	it("names the visibility levels as the privacy settings do", async () => {
		await renderHelp();

		const privacy = within(document.getElementById("privacy")!);

		for (const option of VISIBILITY_OPTIONS)
			expect(privacy.getByText(option.label)).toBeInTheDocument();
		expect(privacy.queryByText("Public")).not.toBeInTheDocument();
		expect(privacy.queryByText("Private")).not.toBeInTheDocument();
	});

	it("describes pinned saved views as living in the View menu", async () => {
		await renderHelp();

		const views = document.getElementById("saved-views")!;

		expect(views).toHaveTextContent("View menu");
		expect(views.textContent).not.toMatch(/\btab\b/);
	});
});
