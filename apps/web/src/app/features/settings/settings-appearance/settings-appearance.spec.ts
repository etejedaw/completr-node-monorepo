import "@testing-library/jest-dom/vitest";

import { signal } from "@angular/core";
import { render, screen } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { of, Subject, throwError } from "rxjs";

import { AuthService } from "../../../core/services/auth";
import {
	THEME_CATALOG,
	type ThemeId,
	type ThemeOption
} from "../../../core/services/theme";
import { ThemeService } from "../../../core/services/theme";
import { ToastService } from "../../../core/services/toast";
import { SettingsAppearance } from "./settings-appearance";

const premiumTheme: ThemeOption = {
	id: "gold-rush" as ThemeId,
	name: "Gold Rush",
	description: "Only for premium accounts.",
	tier: "premium",
	swatches: ["#000000", "#111111", "#ffcc00", "#ffffff"],
	metaColor: "#000000"
};

describe("SettingsAppearance", () => {
	const catalog = [...THEME_CATALOG, premiumTheme];
	const premium = signal(false);
	const loggedIn = signal(true);
	const user = signal<{ theme: string | null } | null>(null);
	const loadUser = vi.fn();
	const themeService = {
		catalog,
		currentId: vi.fn(),
		setLocal: vi.fn(),
		persist: vi.fn()
	};
	const toast = { success: vi.fn(), warning: vi.fn() };

	async function renderAppearance(
		options: { stored?: ThemeId; serverTheme?: string | null } = {}
	) {
		themeService.currentId.mockReturnValue(
			options.stored ?? "refined-dark"
		);
		loadUser.mockReturnValue(
			of({ data: { user: { theme: options.serverTheme ?? null } } })
		);
		return render(SettingsAppearance, {
			providers: [
				{ provide: ThemeService, useValue: themeService },
				{
					provide: AuthService,
					useValue: {
						user: user.asReadonly(),
						isPremium: premium.asReadonly(),
						isLoggedIn: loggedIn.asReadonly(),
						loadUser
					}
				},
				{ provide: ToastService, useValue: toast }
			]
		});
	}

	function themeRadio(name: string) {
		return screen.getByRole("radio", { name: new RegExp(name) });
	}

	beforeEach(() => {
		vi.clearAllMocks();
		premium.set(false);
		loggedIn.set(true);
	});

	it("lists the free themes and marks the stored one as selected", async () => {
		await renderAppearance({ stored: "midnight-cyan" });

		expect(screen.getAllByRole("radio")).toHaveLength(3);
		expect(themeRadio("Midnight Cyan")).toHaveAttribute(
			"aria-checked",
			"true"
		);
		expect(themeRadio("Refined Dark")).toHaveAttribute(
			"aria-checked",
			"false"
		);
		expect(
			screen.queryByRole("radio", { name: /Gold Rush/ })
		).not.toBeInTheDocument();
	});

	it("shows premium themes only to premium accounts", async () => {
		premium.set(true);
		await renderAppearance();

		expect(screen.getAllByRole("radio")).toHaveLength(4);
		expect(themeRadio("Gold Rush")).toBeInTheDocument();
	});

	it("adopts the theme saved on the account when it differs from the local one", async () => {
		await renderAppearance({
			stored: "refined-dark",
			serverTheme: "twilight-arcade"
		});

		expect(themeService.setLocal).toHaveBeenCalledWith("twilight-arcade");
		expect(themeRadio("Twilight Arcade")).toHaveAttribute(
			"aria-checked",
			"true"
		);
	});

	it("keeps the local theme when the account has none", async () => {
		await renderAppearance({ serverTheme: null });

		expect(themeService.setLocal).not.toHaveBeenCalled();
		expect(themeRadio("Refined Dark")).toHaveAttribute(
			"aria-checked",
			"true"
		);
	});

	it("persists the chosen theme, confirms and refreshes the account", async () => {
		const typist = userEvent.setup();
		await renderAppearance();
		themeService.persist.mockReturnValue(of({}));
		loadUser.mockClear();

		await typist.click(themeRadio("Twilight Arcade"));

		expect(themeService.persist).toHaveBeenCalledWith("twilight-arcade");
		expect(toast.success).toHaveBeenCalledWith("Twilight Arcade applied.");
		expect(loadUser).toHaveBeenCalledTimes(1);
		expect(themeRadio("Twilight Arcade")).toHaveAttribute(
			"aria-checked",
			"true"
		);
		expect(themeRadio("Twilight Arcade")).toBeEnabled();
	});

	it("disables every theme while one is being saved", async () => {
		const typist = userEvent.setup();
		await renderAppearance();
		themeService.persist.mockReturnValue(new Subject());

		await typist.click(themeRadio("Midnight Cyan"));

		for (const radio of screen.getAllByRole("radio")) {
			expect(radio).toBeDisabled();
		}
		expect(themeRadio("Midnight Cyan")).toHaveAttribute(
			"aria-checked",
			"true"
		);
	});

	it("ignores a click on the theme already selected", async () => {
		const typist = userEvent.setup();
		await renderAppearance();

		await typist.click(themeRadio("Refined Dark"));

		expect(themeService.persist).not.toHaveBeenCalled();
		expect(themeService.setLocal).not.toHaveBeenCalled();
	});

	it("only applies the theme locally when signed out", async () => {
		const typist = userEvent.setup();
		loggedIn.set(false);
		await renderAppearance();

		await typist.click(themeRadio("Midnight Cyan"));

		expect(themeService.setLocal).toHaveBeenCalledWith("midnight-cyan");
		expect(themeService.persist).not.toHaveBeenCalled();
		expect(themeRadio("Midnight Cyan")).toHaveAttribute(
			"aria-checked",
			"true"
		);
		expect(themeRadio("Midnight Cyan")).toBeEnabled();
	});

	it("reverts to the previous theme and warns when saving fails", async () => {
		const typist = userEvent.setup();
		await renderAppearance();
		themeService.persist.mockReturnValue(
			throwError(() => ({ status: 500 }))
		);

		await typist.click(themeRadio("Midnight Cyan"));

		expect(toast.warning).toHaveBeenCalledWith("Could not save theme.");
		expect(themeService.setLocal).toHaveBeenCalledWith("refined-dark");
		expect(themeRadio("Refined Dark")).toHaveAttribute(
			"aria-checked",
			"true"
		);
		expect(themeRadio("Midnight Cyan")).toHaveAttribute(
			"aria-checked",
			"false"
		);
		expect(toast.success).not.toHaveBeenCalled();
	});

	it("explains that a premium theme needs a premium account when the API answers 403", async () => {
		const typist = userEvent.setup();
		await renderAppearance();
		themeService.persist.mockReturnValue(
			throwError(() => ({ status: 403 }))
		);

		await typist.click(themeRadio("Twilight Arcade"));

		expect(toast.warning).toHaveBeenCalledWith(
			"That theme requires a premium account."
		);
		expect(themeRadio("Refined Dark")).toHaveAttribute(
			"aria-checked",
			"true"
		);
	});

	it("persists a premium theme for premium accounts", async () => {
		const typist = userEvent.setup();
		premium.set(true);
		await renderAppearance();
		themeService.persist.mockReturnValue(of({}));

		await typist.click(themeRadio("Gold Rush"));

		expect(themeService.persist).toHaveBeenCalledWith("gold-rush");
		expect(toast.success).toHaveBeenCalledWith("Gold Rush applied.");
	});
});
