import "@testing-library/jest-dom/vitest";

import { signal } from "@angular/core";
import { render, screen, within } from "@testing-library/angular";

import { ExportService } from "../../../../core/services/export";
import { ToastService } from "../../../../core/services/toast";
import { type RewindStoryImage } from "../../rewind-story-image.model";
import {
	type RewindPreviewSize,
	RewindShareActions
} from "./rewind-share-actions";

function storyImage(objectUrl = "blob:story"): RewindStoryImage {
	return {
		target: signal({ username: "ada", year: 2026, design: "2026" }),
		blob: signal(new Blob(["png"], { type: "image/png" })),
		objectUrl: signal(objectUrl),
		isLoading: signal(false),
		hasError: signal(false),
		request: vi.fn(),
		retry: vi.fn()
	};
}

async function renderShare(
	previewSize: RewindPreviewSize,
	gamesImage: RewindStoryImage | null = null
) {
	return render(RewindShareActions, {
		inputs: {
			image: storyImage(),
			gamesImage,
			previewAlt: "Rewind 2026 story",
			previewSize
		},
		providers: [
			{
				provide: ToastService,
				useValue: { success: vi.fn(), error: vi.fn() }
			},
			{ provide: ExportService, useValue: { saveFile: vi.fn() } }
		]
	});
}

describe("RewindShareActions layout", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("puts the preview on a stage with the actions below it on the page", async () => {
		const { container } = await renderShare("fit-row");

		const stage = container.firstElementChild as HTMLElement;
		expect(stage.className).toContain("rounded-card");
		expect(
			stage.querySelector(":scope > span[aria-hidden='true']")
		).not.toBeNull();
		expect(
			screen.getByRole("img", { name: "Rewind 2026 story" })
		).toBeInTheDocument();

		const download = screen.getByRole("button", { name: /Download image/ });
		const copy = screen.getByRole("button", { name: /Copy link/ });
		expect(download.parentElement?.className).toContain("grid-cols-2");
		expect(copy.getAttribute("data-variant")).not.toBe("ghost");
		expect(download.className).toContain("col-span-2");
		expect(copy.className).toContain("col-span-2");
	});

	it("keeps the side by side layout without a stage in the share dialog", async () => {
		const { container } = await renderShare("full");

		const layout = container.firstElementChild as HTMLElement;
		expect(layout.className).toContain("md:flex-row");
		expect(layout.className).not.toContain("rounded-card");
		expect(
			layout.querySelector(":scope > span[aria-hidden='true']")
		).toBeNull();
		expect(
			screen.getByRole("button", { name: /Download image/ }).parentElement
				?.className
		).not.toContain("grid-cols-2");
	});

	it("pairs Share images with Copy link and the two downloads below them on the page", async () => {
		vi.stubGlobal("navigator", {
			...navigator,
			canShare: vi.fn(() => true),
			share: vi.fn()
		});
		await renderShare("fit-row", storyImage("blob:games"));

		const buttons = within(
			screen.getByRole("button", { name: /Share images/ })
				.parentElement as HTMLElement
		)
			.getAllByRole("button")
			.map(button => button.textContent?.replace(/\s+/g, " ").trim());
		expect(buttons).toEqual([
			"ios_share Share images",
			"link Copy link",
			"download Download summary",
			"download Download games"
		]);
		for (const button of screen.getAllByRole("button", {
			name: /Share images|Copy link|Download/
		}))
			expect(button.className).not.toContain("col-span-2");
	});

	it("puts the two downloads side by side and Copy link below without file sharing", async () => {
		await renderShare("fit-row", storyImage("blob:games"));

		expect(
			screen.queryByRole("button", { name: /Share/ })
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /Download summary/ }).className
		).not.toContain("col-span-2");
		expect(
			screen.getByRole("button", { name: /Download games/ }).className
		).not.toContain("col-span-2");
		expect(
			screen.getByRole("button", { name: /Copy link/ }).className
		).toContain("col-span-2");
		expect(
			screen.getByRole("tablist", { name: "Story images" })
		).toBeInTheDocument();
	});
});

describe("RewindShareActions failed downloads", () => {
	it("warns once when a download waits for an image that fails, and ignores a double click", async () => {
		const toast = { success: vi.fn(), error: vi.fn() };
		const blob = signal<Blob | null>(null);
		const hasError = signal(false);
		const gamesImage: RewindStoryImage = {
			...storyImage("blob:games"),
			blob,
			hasError,
			request: vi.fn()
		};
		const { fixture } = await render(RewindShareActions, {
			inputs: {
				image: storyImage(),
				gamesImage,
				previewAlt: "Rewind 2026 story"
			},
			providers: [
				{ provide: ToastService, useValue: toast },
				{ provide: ExportService, useValue: { saveFile: vi.fn() } }
			]
		});

		const requestsBefore = vi.mocked(gamesImage.request).mock.calls.length;
		const button = screen.getByRole("button", { name: "Download games" });
		button.click();
		button.click();
		fixture.detectChanges();
		expect(gamesImage.request).toHaveBeenCalledTimes(requestsBefore + 1);

		hasError.set(true);
		fixture.detectChanges();
		await fixture.whenStable();

		expect(toast.error).toHaveBeenCalledTimes(1);
		expect(toast.error).toHaveBeenCalledWith(
			"Couldn't download the image. Try again."
		);
		expect(
			screen.getByRole("button", { name: "Download games" })
		).toBeEnabled();
	});
});
