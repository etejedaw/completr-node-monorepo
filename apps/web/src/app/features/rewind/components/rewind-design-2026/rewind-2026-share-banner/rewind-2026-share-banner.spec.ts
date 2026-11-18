import "@testing-library/jest-dom/vitest";

import { signal } from "@angular/core";
import { render, screen } from "@testing-library/angular";

import { ExportService } from "../../../../../core/services/export";
import { ToastService } from "../../../../../core/services/toast";
import { type RewindStoryImage } from "../../../rewind-story-image.model";
import { Rewind2026ShareBanner } from "./rewind-2026-share-banner";
import { type Rewind2026ShareBannerSource } from "./rewind-2026-share-banner.model";

function storyImage(): RewindStoryImage {
	return {
		target: signal({ username: "ada", year: 2026, design: "2026" }),
		blob: signal<Blob | null>(null),
		objectUrl: signal<string | null>(null),
		isLoading: signal(false),
		hasError: signal(false),
		request: vi.fn(),
		retry: vi.fn()
	};
}

function source(
	overrides: Partial<Rewind2026ShareBannerSource> = {}
): Rewind2026ShareBannerSource {
	return {
		year: 2026,
		language: "en",
		highlights: { topRated: null },
		finishedGames: [],
		...overrides
	};
}

interface RenderOptions {
	rewind?: Rewind2026ShareBannerSource;
	isOwner?: boolean;
	username?: string;
}

async function renderBanner({
	rewind = source(),
	isOwner = false,
	username = "ada"
}: RenderOptions = {}) {
	const image = storyImage();
	const gamesImage = storyImage();
	await render(Rewind2026ShareBanner, {
		inputs: {
			rewind,
			image,
			gamesImage,
			previewAlt: "Ada's 2026 Rewind",
			isOwner,
			username
		},
		providers: [
			{
				provide: ToastService,
				useValue: { success: vi.fn(), error: vi.fn(), warning: vi.fn() }
			},
			{ provide: ExportService, useValue: { saveFile: vi.fn() } }
		]
	});
	return { image, gamesImage };
}

describe("Rewind2026ShareBanner", () => {
	it("keeps the full story banner for the owner", async () => {
		await renderBanner({ isOwner: true });

		expect(
			screen.getByRole("region", {
				name: "Your 2026, ready for your stories"
			})
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Download" })
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Share link" })
		).not.toBeInTheDocument();
	});

	it("shows the compact row to a visitor, in English", async () => {
		await renderBanner();

		expect(
			screen.getByRole("region", { name: "Share @ada's 2026 Rewind" })
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Share link" })
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Download" })
		).not.toBeInTheDocument();
		expect(screen.queryByRole("group")).not.toBeInTheDocument();
	});

	it("shows the compact row in Spanish when the Rewind is in Spanish", async () => {
		await renderBanner({ rewind: source({ language: "es" }) });

		expect(
			screen.getByRole("region", {
				name: "Comparte el Rewind 2026 de @ada"
			})
		).toBeInTheDocument();
	});

	it("follows the year of the Rewind", async () => {
		await renderBanner({ rewind: source({ year: 2024 }) });

		expect(
			screen.getByRole("region", { name: "Share @ada's 2024 Rewind" })
		).toBeInTheDocument();
	});

	it("never asks for the story images when a visitor opens it", async () => {
		const { image, gamesImage } = await renderBanner();

		expect(image.request).not.toHaveBeenCalled();
		expect(gamesImage.request).not.toHaveBeenCalled();
	});

	it("keeps one share heading for either audience", async () => {
		const owner = await render(Rewind2026ShareBanner, {
			inputs: {
				rewind: source(),
				image: storyImage(),
				previewAlt: "x",
				isOwner: true,
				username: "ada"
			},
			providers: [
				{
					provide: ToastService,
					useValue: {
						success: vi.fn(),
						error: vi.fn(),
						warning: vi.fn()
					}
				},
				{ provide: ExportService, useValue: { saveFile: vi.fn() } }
			]
		});

		expect(
			owner.container.querySelectorAll("#rewind-share-heading")
		).toHaveLength(1);
	});
});
