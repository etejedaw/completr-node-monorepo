import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
	type TestRequest
} from "@angular/common/http/testing";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { render, screen, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { of } from "rxjs";

import { environment } from "../../../../environments/environment";
import { type User } from "../../../core/models/user.model";
import { AuthService } from "../../../core/services/auth";
import { ToastService } from "../../../core/services/toast";
import { SettingsPrivacy } from "./settings-privacy";

const api = environment.apiUrl;

const privateProfileUser = {
	id: "u1",
	username: "ada",
	role: "user",
	profileVisibility: "private",
	backlogVisibility: "private",
	shelfVisibility: "private",
	listVisibility: "private",
	queueVisibility: "private",
	wishlistVisibility: "private",
	favoriteVisibility: "private",
	feedVisibility: "private",
	platinumVisibility: "public",
	franchiseVisibility: "private",
	rewindVisibility: "public",
	acceptFollowRequests: true
} as unknown as User;

describe("SettingsPrivacy: Rewind under a private profile", () => {
	let httpTesting: HttpTestingController;
	const user = signal<User | null>(null);
	const loadUser = vi.fn();
	const toast = { success: vi.fn(), warning: vi.fn() };
	const patchBodies: Partial<User>[] = [];

	async function renderPrivacy(overrides: Partial<User> = {}) {
		user.set({ ...privateProfileUser, ...overrides } as User);
		const result = await render(SettingsPrivacy, {
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				provideRouter([]),
				{ provide: AuthService, useValue: { user, loadUser } },
				{ provide: ToastService, useValue: toast }
			]
		});
		httpTesting = TestBed.inject(HttpTestingController);
		answerFollowRequests();
		await result.fixture.whenStable();
		result.fixture.detectChanges();
		return result;
	}

	function answerFollowRequests() {
		for (const request of httpTesting.match(
			`${api}/users/me/follow-requests`
		))
			request.flush({ data: { requests: [] } });
	}

	function takePatch(): TestRequest {
		const patch = httpTesting.expectOne(`${api}/users/me`);
		expect(patch.request.method).toBe("PATCH");
		patchBodies.push(patch.request.body as Partial<User>);
		return patch;
	}

	function rewindLevel(name: RegExp) {
		return within(
			screen.getByRole("radiogroup", { name: "Rewind visibility" })
		).getByRole("radio", { name });
	}

	beforeEach(() => {
		patchBodies.length = 0;
		toast.success.mockReset();
		toast.warning.mockReset();
		loadUser.mockReset().mockReturnValue(of(undefined));
	});

	afterEach(() => {
		httpTesting.match(() => true);
		httpTesting.verify();
	});

	it("has no switch to show the Rewind past a private profile", async () => {
		await renderPrivacy();

		expect(
			screen.queryByRole("switch", { name: /rewind/i })
		).not.toBeInTheDocument();
		expect(
			screen.queryByText(/even if my profile is private/i)
		).not.toBeInTheDocument();
	});

	it("lifts the profile cap only for the Rewind", async () => {
		await renderPrivacy({ queueVisibility: "public" });

		const alert = screen
			.getByText(/Your profile is set to/)
			.closest("ui-alert")!;
		expect(alert).toHaveTextContent("so no section except your Rewind");
		const rewindRow = screen
			.getByRole("radiogroup", { name: "Rewind visibility" })
			.closest("app-settings-row")!;
		expect(rewindRow).not.toHaveTextContent("Effectively");
		const queueRow = screen
			.getByRole("radiogroup", { name: "Up Next visibility" })
			.closest("app-settings-row")!;
		expect(queueRow).toHaveTextContent("Effectively Only you");
	});

	it("follows the level picked for the Rewind even if it is changed several times", async () => {
		const interaction = userEvent.setup();
		await renderPrivacy();
		const rewindRow = screen
			.getByRole("radiogroup", { name: "Rewind visibility" })
			.closest("app-settings-row")!;

		await interaction.click(rewindLevel(/friends/i));
		await interaction.click(rewindLevel(/only you/i));
		await interaction.dblClick(rewindLevel(/everyone/i));

		expect(rewindRow).not.toHaveTextContent("Effectively");
		expect(rewindLevel(/everyone/i)).toBeChecked();
	});

	it("saves the privacy draft without the removed field", async () => {
		const interaction = userEvent.setup();
		await renderPrivacy();

		await interaction.click(rewindLevel(/friends/i));
		await interaction.click(
			screen.getByRole("button", { name: /save changes/i })
		);
		takePatch().flush({
			data: {
				user: { ...privateProfileUser, rewindVisibility: "friends" }
			}
		});
		answerFollowRequests();

		expect(patchBodies[0]).toMatchObject({ rewindVisibility: "friends" });
		expect(patchBodies[0]).not.toHaveProperty(
			"rewindIgnoresProfileVisibility"
		);
	});
});
