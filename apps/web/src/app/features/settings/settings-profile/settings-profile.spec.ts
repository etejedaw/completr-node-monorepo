import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { fireEvent, render, screen } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { of, Subject, throwError } from "rxjs";

import { type User } from "../../../core/models";
import { AuthService } from "../../../core/services/auth";
import { ToastService } from "../../../core/services/toast";
import { ProfileService } from "../../profile/profile";
import { SettingsProfile } from "./settings-profile";

function buildUser(overrides: Partial<User> = {}): User {
	return {
		id: "u1",
		username: "ada",
		email: "ada@example.com",
		role: "user",
		name: "Ada Lovelace",
		bio: "Backlog survivor.",
		avatarUrl: null,
		theme: null,
		...overrides
	} as User;
}

describe("SettingsProfile", () => {
	const user = signal<User | null>(null);
	const loadUser = vi.fn();
	const update = vi.fn();
	const toast = { success: vi.fn(), warning: vi.fn() };

	async function renderProfile(account: User | null = buildUser()) {
		user.set(account);
		loadUser.mockReturnValue(of({ data: { user: account } }));
		return render(SettingsProfile, {
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{
					provide: AuthService,
					useValue: { user: user.asReadonly(), loadUser }
				},
				{ provide: ProfileService, useValue: { update } },
				{ provide: ToastService, useValue: toast }
			]
		});
	}

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		const httpTesting = TestBed.inject(HttpTestingController);
		httpTesting
			.match(() => true)
			.forEach(req => req.flush(null, { status: 404, statusText: "x" }));
	});

	it("shows a loading skeleton until the account is known", async () => {
		await renderProfile(null);

		expect(
			screen.getByLabelText("Loading profile settings")
		).toHaveAttribute("aria-busy", "true");
		expect(screen.queryByLabelText("Display name")).not.toBeInTheDocument();
	});

	it("fills the form with the saved profile and hides the save bar", async () => {
		await renderProfile();

		expect(screen.getByLabelText("Display name")).toHaveValue(
			"Ada Lovelace"
		);
		expect(screen.getByLabelText("Bio")).toHaveValue("Backlog survivor.");
		expect(
			screen.getByRole("radio", { name: "Use my initial" })
		).toHaveAttribute("aria-checked", "true");
		expect(
			screen.queryByRole("region", { name: "Unsaved changes" })
		).not.toBeInTheDocument();
	});

	it("falls back to empty fields when the account has no name or bio", async () => {
		await renderProfile(buildUser({ name: null, bio: null } as never));

		expect(screen.getByLabelText("Display name")).toHaveValue("");
		expect(screen.getByLabelText("Bio")).toHaveValue("");
		expect(screen.getByText("@ada")).toBeInTheDocument();
	});

	it("previews the typed name and bio and counts characters", async () => {
		const typist = userEvent.setup();
		await renderProfile();

		const name = screen.getByLabelText("Display name");
		await typist.clear(name);
		await typist.type(name, "Grace");

		const preview = screen.getByRole("region", { name: "Profile preview" });
		expect(preview).toHaveTextContent("Grace");
		expect(screen.getByText("5/80")).toBeInTheDocument();
		expect(screen.getByText("17/250")).toBeInTheDocument();
	});

	it("previews the username when the display name is blank", async () => {
		const typist = userEvent.setup();
		await renderProfile();

		await typist.clear(screen.getByLabelText("Display name"));

		expect(
			screen.getByRole("region", { name: "Profile preview" })
		).not.toHaveTextContent("Ada Lovelace");
		expect(screen.getAllByText("ada").length).toBeGreaterThan(0);
	});

	it("shows the save bar when a field changes and hides it when the change is reverted", async () => {
		const typist = userEvent.setup();
		await renderProfile();

		const name = screen.getByLabelText("Display name");
		await typist.type(name, "!");
		expect(
			screen.getByRole("region", { name: "Unsaved changes" })
		).toBeInTheDocument();

		await typist.type(name, "{Backspace}");
		expect(
			screen.queryByRole("region", { name: "Unsaved changes" })
		).not.toBeInTheDocument();
	});

	it("restores the saved values when discarding", async () => {
		const typist = userEvent.setup();
		await renderProfile();

		await typist.type(screen.getByLabelText("Display name"), " Jr");
		await typist.click(screen.getByRole("radio", { name: "Avatar 3" }));
		await typist.click(screen.getByRole("button", { name: "Discard" }));

		expect(screen.getByLabelText("Display name")).toHaveValue(
			"Ada Lovelace"
		);
		expect(
			screen.getByRole("radio", { name: "Use my initial" })
		).toHaveAttribute("aria-checked", "true");
		expect(
			screen.queryByRole("region", { name: "Unsaved changes" })
		).not.toBeInTheDocument();
		expect(update).not.toHaveBeenCalled();
	});

	it("selects an avatar and lets the user go back to the initial", async () => {
		const typist = userEvent.setup();
		await renderProfile();

		const avatar = screen.getByRole("radio", { name: "Avatar 3" });
		await typist.click(avatar);
		expect(avatar).toHaveAttribute("aria-checked", "true");
		expect(
			screen.getByRole("radio", { name: "Use my initial" })
		).toHaveAttribute("aria-checked", "false");
		expect(screen.getAllByRole("radio")).toHaveLength(16);

		await typist.click(
			screen.getByRole("radio", { name: "Use my initial" })
		);
		expect(avatar).toHaveAttribute("aria-checked", "false");
		expect(
			screen.queryByRole("region", { name: "Unsaved changes" })
		).not.toBeInTheDocument();
	});

	it("saves the trimmed profile, confirms with a toast and refreshes the account", async () => {
		const typist = userEvent.setup();
		await renderProfile();
		update.mockReturnValue(of(buildUser()));

		const name = screen.getByLabelText("Display name");
		await typist.clear(name);
		await typist.type(name, "  Grace Hopper  ");
		await typist.click(screen.getByRole("radio", { name: "Avatar 2" }));
		loadUser.mockClear();
		await typist.click(
			screen.getByRole("button", { name: "Save changes" })
		);

		expect(update).toHaveBeenCalledWith({
			name: "Grace Hopper",
			bio: "Backlog survivor.",
			avatarUrl: "/avatars/completr_profile_02.png"
		});
		expect(toast.success).toHaveBeenCalledWith("Profile updated.");
		expect(loadUser).toHaveBeenCalledTimes(1);
		expect(
			screen.queryByRole("region", { name: "Unsaved changes" })
		).not.toBeInTheDocument();
	});

	it("sends undefined for cleared fields", async () => {
		const typist = userEvent.setup();
		await renderProfile();
		update.mockReturnValue(of(buildUser()));

		await typist.clear(screen.getByLabelText("Display name"));
		await typist.clear(screen.getByLabelText("Bio"));
		await typist.click(
			screen.getByRole("button", { name: "Save changes" })
		);

		expect(update).toHaveBeenCalledWith({
			name: undefined,
			bio: undefined,
			avatarUrl: undefined
		});
	});

	it("shows saving state while the request is pending", async () => {
		const typist = userEvent.setup();
		await renderProfile();
		const pending = new Subject<User>();
		update.mockReturnValue(pending);

		await typist.type(screen.getByLabelText("Display name"), "!");
		await typist.click(
			screen.getByRole("button", { name: "Save changes" })
		);

		expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "Discard" })).toBeDisabled();
	});

	it("warns and keeps the changes when the API fails", async () => {
		const typist = userEvent.setup();
		await renderProfile();
		update.mockReturnValue(throwError(() => ({ status: 500 })));

		await typist.type(screen.getByLabelText("Display name"), "!");
		await typist.click(
			screen.getByRole("button", { name: "Save changes" })
		);

		expect(toast.warning).toHaveBeenCalledWith("Could not update profile.");
		expect(toast.success).not.toHaveBeenCalled();
		expect(screen.getByLabelText("Display name")).toHaveValue(
			"Ada Lovelace!"
		);
		expect(
			screen.getByRole("button", { name: "Save changes" })
		).toBeEnabled();
	});

	it("limits the inputs with the maximum lengths", async () => {
		await renderProfile();

		expect(screen.getByLabelText("Display name")).toHaveAttribute(
			"maxlength",
			"80"
		);
		expect(screen.getByLabelText("Bio")).toHaveAttribute(
			"maxlength",
			"250"
		);
	});

	it("flags a name over 80 characters and blocks saving", async () => {
		await renderProfile();

		fireEvent.input(screen.getByLabelText("Display name"), {
			target: { value: "a".repeat(81) }
		});

		expect(
			screen.getByText("Keep it under 80 characters.")
		).toBeInTheDocument();
		expect(
			screen.getByText("Fix the highlighted fields")
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Save changes" })
		).toBeDisabled();
		expect(update).not.toHaveBeenCalled();
	});

	it("flags a bio over 250 characters", async () => {
		await renderProfile();

		fireEvent.input(screen.getByLabelText("Bio"), {
			target: { value: "b".repeat(251) }
		});

		expect(
			screen.getByText("Keep it under 250 characters.")
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Save changes" })
		).toBeDisabled();
	});

	it("accepts a name of exactly 80 characters", async () => {
		await renderProfile();

		fireEvent.input(screen.getByLabelText("Display name"), {
			target: { value: "a".repeat(80) }
		});

		expect(
			screen.queryByText("Keep it under 80 characters.")
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Save changes" })
		).toBeEnabled();
	});
});
