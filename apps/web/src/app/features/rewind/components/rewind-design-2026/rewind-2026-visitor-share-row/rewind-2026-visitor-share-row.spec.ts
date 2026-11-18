import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/angular";

import { type RewindLanguage } from "../../../../../core/models/rewind.model";
import { ToastService } from "../../../../../core/services/toast";
import { Rewind2026VisitorShareRow } from "./rewind-2026-visitor-share-row";

const SHARE_URL = `${window.location.origin}/share/rewind/ada/2026`;

interface RenderOptions {
	username?: string;
	language?: RewindLanguage;
}

async function renderRow({
	username = "ada",
	language = "en"
}: RenderOptions = {}) {
	const toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn() };
	const view = await render(Rewind2026VisitorShareRow, {
		inputs: {
			username,
			year: 2026,
			language,
			title: "Ada's 2026 Rewind"
		},
		providers: [{ provide: ToastService, useValue: toast }]
	});
	return { ...view, toast };
}

function touchDevice(share: () => Promise<void>) {
	vi.stubGlobal("navigator", { ...navigator, share });
	vi.stubGlobal(
		"matchMedia",
		vi.fn((query: string) => ({
			matches: query === "(pointer: coarse)"
		}))
	);
}

async function pressShareLink(view: Awaited<ReturnType<typeof renderRow>>) {
	screen.getByRole("button", { name: "Share link" }).click();
	view.fixture.detectChanges();
	await view.fixture.whenStable();
}

describe("Rewind2026VisitorShareRow", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("is one section named by its heading, in English", async () => {
		await renderRow();

		expect(
			screen.getByRole("region", { name: "Share @ada's 2026 Rewind" })
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", {
				level: 2,
				name: "Share @ada's 2026 Rewind"
			})
		).toBeInTheDocument();
	});

	it("speaks Spanish in the heading while the action stays English", async () => {
		await renderRow({ language: "es" });

		expect(
			screen.getByRole("region", {
				name: "Comparte el Rewind 2026 de @ada"
			})
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Share link" })
		).toBeInTheDocument();
	});

	it("offers one action and nothing about images, downloads or posters", async () => {
		const { container } = await renderRow();

		expect(screen.getAllByRole("button")).toHaveLength(1);
		expect(container.querySelectorAll("img")).toHaveLength(0);
		expect(screen.queryByRole("figure")).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /Download|Copy link/ })
		).not.toBeInTheDocument();
		expect(screen.queryByText(/stories|images/i)).not.toBeInTheDocument();
	});

	it("gives the action a touch-sized hit area and hides its icon", async () => {
		await renderRow();
		const button = screen.getByRole("button", { name: "Share link" });

		expect(button).toHaveClass("tap:min-h-[44px]");
		expect(button.querySelector(".material-icons")).toHaveAttribute(
			"aria-hidden",
			"true"
		);
	});

	it("lets a very long username wrap instead of pushing the button out", async () => {
		await renderRow({ username: "a".repeat(80) });

		expect(screen.getByRole("heading", { level: 2 }).className).toContain(
			"[overflow-wrap:anywhere]"
		);
	});

	it("keeps working with an empty username", async () => {
		await renderRow({ username: "" });

		expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
			"Share @'s 2026 Rewind"
		);
	});

	describe("on a touch device", () => {
		it("opens the native share sheet with the link", async () => {
			const share = vi.fn(() => Promise.resolve());
			touchDevice(share);

			await pressShareLink(await renderRow());

			expect(share).toHaveBeenCalledTimes(1);
			expect(share).toHaveBeenCalledWith({
				title: "Ada's 2026 Rewind",
				url: SHARE_URL
			});
		});

		it("shares once however fast the action is double clicked", async () => {
			const share = vi.fn(() => Promise.resolve());
			touchDevice(share);
			const view = await renderRow();

			const button = screen.getByRole("button", { name: "Share link" });
			button.click();
			button.click();
			view.fixture.detectChanges();
			await view.fixture.whenStable();

			expect(share).toHaveBeenCalledTimes(1);
		});

		it("stays silent when the share sheet is dismissed", async () => {
			touchDevice(
				vi.fn(() =>
					Promise.reject(new DOMException("closed", "AbortError"))
				)
			);
			const view = await renderRow();

			await pressShareLink(view);

			expect(view.toast.success).not.toHaveBeenCalled();
			expect(view.toast.warning).not.toHaveBeenCalled();
		});

		it("falls back to copying the link when the share sheet fails", async () => {
			const writeText = vi.fn(() => Promise.resolve());
			vi.stubGlobal("navigator", {
				...navigator,
				clipboard: { writeText },
				share: vi.fn(() => Promise.reject(new Error("boom")))
			});
			vi.stubGlobal(
				"matchMedia",
				vi.fn((query: string) => ({
					matches: query === "(pointer: coarse)"
				}))
			);
			const view = await renderRow();

			await pressShareLink(view);

			expect(writeText).toHaveBeenCalledWith(SHARE_URL);
			expect(view.toast.success).toHaveBeenCalledWith("Link copied");
		});
	});

	describe("on a desktop", () => {
		it("copies the link and confirms it", async () => {
			const writeText = vi.fn(() => Promise.resolve());
			vi.stubGlobal("navigator", {
				...navigator,
				clipboard: { writeText }
			});
			const view = await renderRow();

			await pressShareLink(view);

			expect(writeText).toHaveBeenCalledWith(SHARE_URL);
			expect(view.toast.success).toHaveBeenCalledWith("Link copied");
		});

		it("copies once on a double click", async () => {
			const writeText = vi.fn(() => Promise.resolve());
			vi.stubGlobal("navigator", {
				...navigator,
				clipboard: { writeText }
			});
			const view = await renderRow();

			const button = screen.getByRole("button", { name: "Share link" });
			button.click();
			button.click();
			view.fixture.detectChanges();
			await view.fixture.whenStable();

			expect(writeText).toHaveBeenCalledTimes(1);
		});

		it("warns instead of failing when the clipboard is missing", async () => {
			vi.stubGlobal("navigator", {
				...navigator,
				clipboard: undefined
			});
			const view = await renderRow();

			await pressShareLink(view);

			expect(view.toast.warning).toHaveBeenCalledWith(
				"Couldn't copy the link."
			);
		});
	});
});
