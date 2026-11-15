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
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { of } from "rxjs";

import { environment } from "../../../../environments/environment";
import { type User } from "../../../core/models/user.model";
import { AuthService } from "../../../core/services/auth";
import { ToastService } from "../../../core/services/toast";
import { REWIND_PROFILE_BYPASS } from "./privacy-options";
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
	rewindIgnoresProfileVisibility: false,
	acceptFollowRequests: true
} as unknown as User;

describe("SettingsPrivacy: Rewind even if the profile is private", () => {
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

	function bypassSwitch() {
		return screen.getByRole("switch", {
			name: REWIND_PROFILE_BYPASS.label
		});
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

	it("shows the switch right after the Rewind row, off by default", async () => {
		await renderPrivacy();

		const rewindRow = screen
			.getByRole("radiogroup", { name: "Rewind visibility" })
			.closest("app-settings-row")!;
		const bypassRow = bypassSwitch().closest("app-settings-row")!;

		expect(rewindRow.nextElementSibling).toBe(bypassRow);
		expect(bypassSwitch()).toHaveAttribute("aria-checked", "false");
		expect(bypassSwitch()).toBeEnabled();
		expect(bypassSwitch()).not.toHaveAttribute("aria-describedby");
	});

	it("saves the switch with the rest of the privacy draft", async () => {
		const interaction = userEvent.setup();
		await renderPrivacy();

		await interaction.click(bypassSwitch());
		await interaction.click(
			screen.getByRole("button", { name: /save changes/i })
		);
		takePatch().flush({
			data: {
				user: {
					...privateProfileUser,
					rewindIgnoresProfileVisibility: true
				}
			}
		});
		answerFollowRequests();

		expect(patchBodies[0]).toMatchObject({
			rewindIgnoresProfileVisibility: true,
			rewindVisibility: "public",
			profileVisibility: "private"
		});
		await waitFor(() =>
			expect(
				screen.queryByText("Unsaved changes")
			).not.toBeInTheDocument()
		);
		expect(toast.success).toHaveBeenCalledWith("Privacy settings updated.");
	});

	it("lifts the profile cap only for the Rewind while the switch is on", async () => {
		const interaction = userEvent.setup();
		await renderPrivacy({ queueVisibility: "public" });

		const alert = screen
			.getByText(/Your profile is set to/)
			.closest("ui-alert")!;
		expect(alert).toHaveTextContent("so no section can be seen");
		const rewindRow = screen
			.getByRole("radiogroup", { name: "Rewind visibility" })
			.closest("app-settings-row")!;
		expect(rewindRow).toHaveTextContent("Effectively Only you");

		await interaction.click(bypassSwitch());

		expect(alert).toHaveTextContent("so no section except your Rewind");
		expect(rewindRow).not.toHaveTextContent("Effectively");
		const queueRow = screen
			.getByRole("radiogroup", { name: "Up Next visibility" })
			.closest("app-settings-row")!;
		expect(queueRow).toHaveTextContent("Effectively Only you");
	});

	it("disables the switch with an explanation while the Rewind is Only you", async () => {
		const interaction = userEvent.setup();
		await renderPrivacy({ rewindIgnoresProfileVisibility: true });

		await interaction.click(rewindLevel(/only you/i));

		const explanation = screen.getByText(
			REWIND_PROFILE_BYPASS.unavailableHint
		);
		expect(bypassSwitch()).toBeDisabled();
		expect(bypassSwitch()).toHaveAttribute(
			"aria-describedby",
			explanation.closest("p")!.id
		);
		expect(
			screen.getByText(/Your profile is set to/).closest("ui-alert")
		).toHaveTextContent("so no section can be seen");

		await interaction.click(bypassSwitch());
		await interaction.dblClick(bypassSwitch());
		expect(bypassSwitch()).toHaveAttribute("aria-checked", "true");

		await interaction.click(rewindLevel(/friends/i));
		expect(bypassSwitch()).toBeEnabled();
		expect(
			screen.queryByText(REWIND_PROFILE_BYPASS.unavailableHint)
		).not.toBeInTheDocument();
		expect(bypassSwitch()).toHaveAttribute("aria-checked", "true");
	});

	it("ends in the state of the last press when the switch is hammered", async () => {
		const interaction = userEvent.setup();
		await renderPrivacy();

		await interaction.dblClick(bypassSwitch());
		expect(bypassSwitch()).toHaveAttribute("aria-checked", "false");
		expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();

		await interaction.tripleClick(bypassSwitch());
		bypassSwitch().focus();
		await interaction.keyboard(" {Enter} ");

		expect(bypassSwitch()).toHaveAttribute("aria-checked", "false");
		expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();
	});

	it("restores the saved value when the change is discarded mid-way", async () => {
		const interaction = userEvent.setup();
		await renderPrivacy({ rewindIgnoresProfileVisibility: true });

		await interaction.click(bypassSwitch());
		await interaction.click(rewindLevel(/only you/i));
		await interaction.click(
			screen.getByRole("button", { name: /discard/i })
		);

		expect(bypassSwitch()).toHaveAttribute("aria-checked", "true");
		expect(bypassSwitch()).toBeEnabled();
		expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();
	});

	it("sends a single PATCH when Save is pressed twice and keeps the draft if it fails", async () => {
		const interaction = userEvent.setup();
		await renderPrivacy();

		await interaction.click(bypassSwitch());
		await interaction.dblClick(
			screen.getByRole("button", { name: /save changes/i })
		);
		takePatch().flush(null, { status: 500, statusText: "Server Error" });

		await screen.findByRole("button", { name: /save changes/i });
		expect(patchBodies).toHaveLength(1);
		expect(toast.warning).toHaveBeenCalledWith(
			"Could not update privacy settings."
		);
		expect(bypassSwitch()).toHaveAttribute("aria-checked", "true");
		expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
	});

	it("keeps the saved switch when a preset is chosen and the user goes back to Custom", async () => {
		const interaction = userEvent.setup();
		await renderPrivacy({ rewindIgnoresProfileVisibility: true });
		const presets = screen.getByRole("radiogroup", {
			name: "Privacy level"
		});

		await interaction.click(
			within(presets).getByRole("radio", { name: /everyone/i })
		);
		expect(
			screen.queryByRole("switch", { name: REWIND_PROFILE_BYPASS.label })
		).not.toBeInTheDocument();
		await interaction.click(
			within(presets).getByRole("radio", { name: /custom/i })
		);

		expect(bypassSwitch()).toHaveAttribute("aria-checked", "true");
	});
});
