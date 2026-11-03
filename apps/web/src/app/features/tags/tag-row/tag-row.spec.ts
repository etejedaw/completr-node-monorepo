import "@testing-library/jest-dom/vitest";

import { render, screen, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { type UserTag } from "../../mood-tags/mood-tags.model";
import { TagRow } from "./tag-row";

const cozy: UserTag = { tag: "cozy", usageCount: 4, description: "Rainy days" };

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
