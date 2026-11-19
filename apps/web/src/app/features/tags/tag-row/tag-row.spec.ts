import "@testing-library/jest-dom/vitest";

import { provideRouter } from "@angular/router";
import { render, screen, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { type UserTag } from "../../../core/services/mood-tags.model";
import { TagRow } from "./tag-row";

const cozy: UserTag = {
	tag: "cozy",
	usageCount: 4,
	description: "Rainy days",
	favoriteOrder: null,
	icon: null,
	color: null
};

function stubViewport(mobile: boolean) {
	vi.stubGlobal(
		"matchMedia",
		vi.fn(() => ({
			matches: mobile,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn()
		}))
	);
}

async function renderRow(inputs: { saving?: boolean } = {}) {
	const editRequested = vi.fn();
	const deleteRequested = vi.fn();
	const showGamesRequested = vi.fn();
	await render(TagRow, {
		inputs: { tag: cozy, maxUsage: 4, ...inputs },
		on: { editRequested, deleteRequested, showGamesRequested },
		providers: []
	});
	return { editRequested, deleteRequested, showGamesRequested };
}

describe("TagRow mobile actions", () => {
	beforeEach(() => stubViewport(true));

	afterEach(() => vi.unstubAllGlobals());

	it("opens a sheet named after the tag with the three actions", async () => {
		const user = userEvent.setup();
		await renderRow();

		await user.click(
			screen.getByRole("button", { name: "More actions for cozy" })
		);

		const sheet = await screen.findByRole("dialog", { name: "cozy" });
		expect(
			within(sheet)
				.getAllByRole("button")
				.map(button => button.getAttribute("aria-label") ?? "")
		).toEqual(
			expect.arrayContaining(["Show in My Games", "Edit", "Delete"])
		);
	});

	it("emits each action once and closes the sheet", async () => {
		const user = userEvent.setup();
		const { editRequested, deleteRequested, showGamesRequested } =
			await renderRow();

		for (const [name, spy] of [
			["Show in My Games", showGamesRequested],
			["Edit", editRequested],
			["Delete", deleteRequested]
		] as const) {
			await user.click(
				screen.getByRole("button", { name: "More actions for cozy" })
			);
			const sheet = await screen.findByRole("dialog", { name: "cozy" });
			await user.dblClick(within(sheet).getByRole("button", { name }));
			expect(spy).toHaveBeenCalledTimes(1);
			expect(
				screen.queryByRole("dialog", { name: "cozy" })
			).not.toBeInTheDocument();
		}
	});

	it("closes with Escape without emitting anything", async () => {
		const user = userEvent.setup();
		const { editRequested, deleteRequested, showGamesRequested } =
			await renderRow();

		await user.click(
			screen.getByRole("button", { name: "More actions for cozy" })
		);
		await screen.findByRole("dialog", { name: "cozy" });
		await user.keyboard("{Escape}");

		expect(
			screen.queryByRole("dialog", { name: "cozy" })
		).not.toBeInTheDocument();
		expect(editRequested).not.toHaveBeenCalled();
		expect(deleteRequested).not.toHaveBeenCalled();
		expect(showGamesRequested).not.toHaveBeenCalled();
	});

	it("blocks editing and deleting while the tag is saving", async () => {
		const user = userEvent.setup();
		const { editRequested, deleteRequested, showGamesRequested } =
			await renderRow({ saving: true });

		await user.click(
			screen.getByRole("button", { name: "More actions for cozy" })
		);
		const sheet = await screen.findByRole("dialog", { name: "cozy" });
		await user.click(within(sheet).getByRole("button", { name: "Edit" }));
		await user.click(within(sheet).getByRole("button", { name: "Delete" }));
		await user.click(
			within(sheet).getByRole("button", { name: "Show in My Games" })
		);

		expect(editRequested).not.toHaveBeenCalled();
		expect(deleteRequested).not.toHaveBeenCalled();
		expect(showGamesRequested).toHaveBeenCalledTimes(1);
	});
});

describe("TagRow appearance", () => {
	beforeEach(() => stubViewport(false));

	afterEach(() => vi.unstubAllGlobals());

	const iconGroup = () => screen.getByRole("group", { name: /^Icon/ });
	const colorGroup = () => screen.getByRole("group", { name: /^Color/ });

	async function renderEditing(tag: UserTag) {
		const saved = vi.fn();
		const cancelled = vi.fn();
		const view = await render(TagRow, {
			inputs: { tag, maxUsage: 4, editing: true },
			on: { saved, cancelled },
			providers: [provideRouter([])]
		});
		return { ...view, saved, cancelled };
	}

	it("shows the tag with its own icon and color", async () => {
		await render(TagRow, {
			inputs: {
				tag: { ...cozy, icon: "bolt", color: "rose" },
				maxUsage: 4
			},
			providers: [provideRouter([])]
		});

		const link = screen.getByRole("link", { name: "cozy" });
		const icon = link.querySelector("app-tag-icon") as HTMLElement;
		expect(icon).toHaveTextContent("bolt");
		expect(icon.style.color).toBe("var(--color-view-rose)");
		expect(link.style.getPropertyValue("--tag-color")).toBe(
			"var(--color-view-rose)"
		);
	});

	it("falls back to the tag icon in the brand color", async () => {
		await render(TagRow, {
			inputs: { tag: cozy, maxUsage: 4 },
			providers: [provideRouter([])]
		});

		const link = screen.getByRole("link", { name: "cozy" });
		expect(link.querySelector("app-tag-icon")).toHaveTextContent("label");
		expect(link.style.getPropertyValue("--tag-color")).toBe(
			"var(--color-brand)"
		);
	});

	it("starts the editor on the saved icon and color", async () => {
		await renderEditing({ ...cozy, icon: "star", color: "teal" });

		expect(
			within(iconGroup()).getByRole("button", { name: "Star" })
		).toHaveAttribute("aria-pressed", "true");
		expect(
			within(colorGroup()).getByRole("button", { name: "Teal" })
		).toHaveAttribute("aria-pressed", "true");
	});

	it("treats a color the picker does not offer as no color", async () => {
		await renderEditing({ ...cozy, color: "#ff00ff" });

		expect(
			within(colorGroup()).getByRole("button", { name: "No color" })
		).toHaveAttribute("aria-pressed", "true");
	});

	it("saves the last icon and color after rapid changes", async () => {
		const user = userEvent.setup();
		const { saved } = await renderEditing(cozy);

		for (const name of ["Flag", "Medal", "Eye"])
			await user.click(within(iconGroup()).getByRole("button", { name }));
		for (const name of ["Gray", "Sky blue"])
			await user.click(
				within(colorGroup()).getByRole("button", { name })
			);
		await user.click(screen.getByRole("button", { name: "Save" }));

		expect(saved).toHaveBeenCalledExactlyOnceWith({
			name: "cozy",
			description: "Rainy days",
			icon: "visibility",
			color: "sky"
		});
	});

	it("drops the unsaved icon and color when cancelled midway", async () => {
		const user = userEvent.setup();
		const { saved, cancelled, fixture } = await renderEditing({
			...cozy,
			icon: "star"
		});

		await user.click(
			within(iconGroup()).getByRole("button", { name: "Bolt" })
		);
		await user.click(
			within(colorGroup()).getByRole("button", { name: "Pink" })
		);
		await user.keyboard("{Escape}");

		expect(cancelled).toHaveBeenCalledTimes(1);
		expect(saved).not.toHaveBeenCalled();

		fixture.componentRef.setInput("editing", false);
		fixture.detectChanges();
		fixture.componentRef.setInput("editing", true);
		fixture.detectChanges();

		expect(
			within(iconGroup()).getByRole("button", { name: "Star" })
		).toHaveAttribute("aria-pressed", "true");
		expect(
			within(colorGroup()).getByRole("button", { name: "No color" })
		).toHaveAttribute("aria-pressed", "true");
	});
});
