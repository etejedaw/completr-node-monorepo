import "@testing-library/jest-dom/vitest";

import { signal } from "@angular/core";
import { render, screen } from "@testing-library/angular";

import { ExportService } from "../../../../core/services/export";
import { ToastService } from "../../../../core/services/toast";
import { type RewindStoryImage } from "../../rewind-story-image.model";
import {
	type RewindPreviewSize,
	RewindShareActions
} from "./rewind-share-actions";

function storyImage(): RewindStoryImage {
	return {
		target: signal({ username: "ada", year: 2026 }),
		blob: signal(new Blob(["png"], { type: "image/png" })),
		objectUrl: signal("blob:story"),
		isLoading: signal(false),
		hasError: signal(false),
		request: vi.fn(),
		retry: vi.fn()
	};
}

async function renderShare(previewSize: RewindPreviewSize) {
	return render(RewindShareActions, {
		inputs: {
			image: storyImage(),
			previewAlt: "Rewind 2026 story",
			previewSize,
			language: "en"
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
});
