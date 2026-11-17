import "@testing-library/jest-dom/vitest";

import { signal, type WritableSignal } from "@angular/core";
import { render, screen, within } from "@testing-library/angular";

import {
	type RewindFinishedGame,
	type RewindRatedGame
} from "../../../../../core/models/rewind.model";
import { ExportService } from "../../../../../core/services/export";
import { ToastService } from "../../../../../core/services/toast";
import { type RewindStoryImage } from "../../../rewind-story-image.model";
import {
	REWIND_2026_COLLAGE_TILES,
	rewind2026CollageUrls,
	Rewind2026ShareBanner
} from "./rewind-2026-share-banner";
import { type Rewind2026ShareBannerSource } from "./rewind-2026-share-banner.model";

interface ControlledImage extends RewindStoryImage {
	blob: WritableSignal<Blob | null>;
	objectUrl: WritableSignal<string | null>;
	hasError: WritableSignal<boolean>;
	isLoading: WritableSignal<boolean>;
}

function storyImage(objectUrl = "blob:story"): ControlledImage {
	return {
		target: signal({ username: "ada", year: 2026, design: "2026" }),
		blob: signal<Blob | null>(new Blob(["png"], { type: "image/png" })),
		objectUrl: signal<string | null>(objectUrl),
		isLoading: signal(false),
		hasError: signal(false),
		request: vi.fn(),
		retry: vi.fn()
	};
}

function pendingImage(): ControlledImage {
	return {
		...storyImage(),
		blob: signal<Blob | null>(null),
		objectUrl: signal<string | null>(null),
		isLoading: signal(true)
	};
}

function finished(id: string, coverUrl: string | null): RewindFinishedGame {
	return {
		gameId: id,
		code: id,
		title: id,
		coverUrl,
		backgroundUrl: null,
		finishedAt: "2026-03-01",
		platformAbbreviation: null
	};
}

function source(
	games: RewindFinishedGame[],
	overrides: Partial<Rewind2026ShareBannerSource> = {}
): Rewind2026ShareBannerSource {
	return {
		year: 2026,
		language: "en",
		highlights: { topRated: null },
		finishedGames: games,
		...overrides
	};
}

const games = [
	finished("a", "https://img.test/a.jpg"),
	finished("b", "https://img.test/b.jpg")
];

function stubFileSharing(share = vi.fn(() => Promise.resolve())) {
	vi.stubGlobal("navigator", {
		...navigator,
		canShare: vi.fn(() => true),
		share
	});
	return share;
}

interface RenderOptions {
	rewind?: Rewind2026ShareBannerSource;
	image?: RewindStoryImage;
	gamesImage?: RewindStoryImage | null;
	isOwner?: boolean;
	username?: string;
}

async function renderBanner({
	rewind = source(games),
	image = storyImage(),
	gamesImage = storyImage("blob:games"),
	isOwner = true,
	username = "ada"
}: RenderOptions = {}) {
	const toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn() };
	const saveFile = vi.fn();
	const view = await render(Rewind2026ShareBanner, {
		inputs: {
			rewind,
			image,
			gamesImage,
			previewAlt: "Ada's 2026 Rewind",
			isOwner,
			username
		},
		providers: [
			{ provide: ToastService, useValue: toast },
			{ provide: ExportService, useValue: { saveFile } }
		]
	});
	return { ...view, toast, saveFile };
}

describe("rewind2026CollageUrls", () => {
	it("fills the collage by repeating the posters it has", () => {
		const urls = rewind2026CollageUrls(source(games));

		expect(urls).toHaveLength(REWIND_2026_COLLAGE_TILES);
		expect(new Set(urls)).toEqual(
			new Set(["https://img.test/b.jpg", "https://img.test/a.jpg"])
		);
	});

	it("is empty when no finished game has art", () => {
		expect(rewind2026CollageUrls(source([finished("a", null)]))).toEqual(
			[]
		);
		expect(rewind2026CollageUrls(source([]))).toEqual([]);
	});

	it("starts with the top rated game", () => {
		const topRated: RewindRatedGame = {
			...finished("t", "https://img.test/t.jpg"),
			userRating: 5
		};

		const urls = rewind2026CollageUrls(
			source(games, { highlights: { topRated } })
		);

		expect(urls[0]).toBe("https://img.test/t.jpg");
	});
});

describe("Rewind2026ShareBanner", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("names the section with the English headline, description and label", async () => {
		await renderBanner();

		expect(
			screen.getByRole("region", {
				name: "Your 2026, ready for your stories"
			})
		).toBeInTheDocument();
		expect(screen.getByText("Share")).toBeInTheDocument();
		expect(
			screen.getByText(
				"Two images and a link so your friends can see your year."
			)
		).toBeInTheDocument();
	});

	it("talks about the owner of the Rewind when a visitor opens it, in both languages", async () => {
		await renderBanner({ isOwner: false });

		expect(
			screen.getByRole("region", { name: "@ada's 2026, ready to share" })
		).toBeInTheDocument();
		expect(
			screen.getByText("Two images and a link to show their year.")
		).toBeInTheDocument();
		expect(screen.queryByText(/your stories/)).not.toBeInTheDocument();
	});

	it("talks about the owner in Spanish when a visitor opens it", async () => {
		await renderBanner({
			rewind: source(games, { language: "es" }),
			isOwner: false
		});

		expect(
			screen.getByRole("region", {
				name: "El 2026 de @ada, listo para compartir"
			})
		).toBeInTheDocument();
		expect(
			screen.getByText("Dos imágenes y un enlace para mostrar su año.")
		).toBeInTheDocument();
	});

	it("speaks Spanish in the copy while the actions stay English", async () => {
		await renderBanner({ rewind: source(games, { language: "es" }) });

		expect(
			screen.getByRole("region", {
				name: "Tu 2026, listo para tus historias"
			})
		).toBeInTheDocument();
		expect(screen.getByText("Compartir")).toBeInTheDocument();
		expect(
			screen.getByText(
				"Dos imágenes y un enlace para que tus amigos vean tu año."
			)
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Copy link" })
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Download" })
		).toBeInTheDocument();
	});

	it("shows the summary and the games image side by side", async () => {
		await renderBanner();

		const group = screen.getByRole("group", { name: "Story images" });

		expect(within(group).getAllByRole("figure")).toHaveLength(2);
		expect(
			within(group).getByRole("img", { name: "Ada's 2026 Rewind" })
		).toHaveAttribute("src", "blob:story");
		expect(
			within(group).getByRole("img", {
				name: "Ada's 2026 Rewind: finished games"
			})
		).toHaveAttribute("src", "blob:games");
	});

	it("shows only the summary when there is no games image", async () => {
		await renderBanner({ gamesImage: null });

		expect(screen.getAllByRole("figure")).toHaveLength(1);
		expect(screen.getByRole("figure")).toHaveClass("left-1/2");
	});

	it("hides the poster collage from assistive tech", async () => {
		const { container } = await renderBanner();
		const collage = container.querySelector(
			"div[aria-hidden='true'] img"
		)!.parentElement!;

		expect(collage).toHaveAttribute("aria-hidden", "true");
		expect(collage.querySelectorAll("img[alt='']")).toHaveLength(
			REWIND_2026_COLLAGE_TILES
		);
	});

	it("skips the collage when no finished game has art", async () => {
		const { container } = await renderBanner({ rewind: source([]) });

		expect(container.querySelectorAll("img[alt='']")).toHaveLength(0);
	});

	describe("without file sharing", () => {
		it("makes Copy link the main action and offers no share button", async () => {
			await renderBanner();

			expect(
				screen.queryByRole("button", { name: /^Share/ })
			).not.toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: "Copy link" })
			).toHaveAttribute("data-variant", "primary");
			expect(
				screen.getByRole("button", { name: "Download" })
			).toHaveAttribute("data-variant", "secondary");
		});
	});

	describe("with file sharing", () => {
		it("pairs Share both as primary with Copy link", async () => {
			stubFileSharing();
			await renderBanner();

			expect(
				screen.getByRole("button", { name: "Share both" })
			).toHaveAttribute("data-variant", "primary");
			expect(
				screen.getByRole("button", { name: "Copy link" })
			).toHaveAttribute("data-variant", "secondary");
		});

		it("says Share image when only the summary exists", async () => {
			stubFileSharing();
			await renderBanner({ gamesImage: null });

			expect(
				screen.getByRole("button", { name: "Share image" })
			).toBeInTheDocument();
		});

		it("shares both files once when Share both is double clicked", async () => {
			const share = stubFileSharing();
			const { fixture } = await renderBanner();

			const button = screen.getByRole("button", { name: "Share both" });
			button.click();
			button.click();
			fixture.detectChanges();
			await fixture.whenStable();

			expect(share).toHaveBeenCalledTimes(1);
			const [data] = share.mock.calls[0] as unknown as [
				{ files: File[] }
			];
			expect(data.files.map(file => file.name)).toEqual([
				"completr-rewind-ada-2026.png",
				"completr-rewind-ada-2026-games.png"
			]);
		});

		it("stays silent when the share sheet is dismissed", async () => {
			stubFileSharing(
				vi.fn(() =>
					Promise.reject(new DOMException("closed", "AbortError"))
				)
			);
			const { fixture, toast } = await renderBanner();

			screen.getByRole("button", { name: "Share both" }).click();
			fixture.detectChanges();
			await fixture.whenStable();

			expect(toast.error).not.toHaveBeenCalled();
		});

		it("warns once when sharing fails", async () => {
			stubFileSharing(vi.fn(() => Promise.reject(new Error("boom"))));
			const { fixture, toast } = await renderBanner();

			screen.getByRole("button", { name: "Share both" }).click();
			fixture.detectChanges();
			await fixture.whenStable();

			expect(toast.error).toHaveBeenCalledTimes(1);
			expect(toast.error).toHaveBeenCalledWith(
				"Couldn't share the images. Download them instead."
			);
		});

		it("keeps Share both disabled while an image is still loading", async () => {
			stubFileSharing();
			await renderBanner({ gamesImage: pendingImage() });

			expect(
				screen.getByRole("button", { name: "Share both" })
			).toBeDisabled();
		});
	});

	describe("images", () => {
		it("shows a skeleton and requests the images while one is loading", async () => {
			const gamesImage = pendingImage();
			await renderBanner({ gamesImage });

			const figure = screen.getAllByRole("figure")[1];

			expect(figure).toHaveAttribute("aria-busy", "true");
			expect(
				within(figure).getByText("Preparing the image")
			).toBeInTheDocument();
			expect(within(figure).queryByRole("img")).not.toBeInTheDocument();
		});

		it("shows the error on the failed image only and retries it", async () => {
			const gamesImage = pendingImage();
			gamesImage.isLoading.set(false);
			gamesImage.hasError.set(true);
			const { fixture } = await renderBanner({ gamesImage });

			const [summary, games] = screen.getAllByRole("figure");
			expect(
				within(summary).queryByText("Couldn't load the image.")
			).not.toBeInTheDocument();
			expect(
				within(games).getByText("Couldn't load the image.")
			).toBeInTheDocument();

			const retry = within(games).getByRole("button", {
				name: "Try again"
			});
			retry.click();
			fixture.detectChanges();

			expect(gamesImage.retry).toHaveBeenCalled();
		});
	});

	describe("download", () => {
		it("saves both images when they are ready, once per double click", async () => {
			const { saveFile } = await renderBanner();

			const button = screen.getByRole("button", { name: "Download" });
			button.click();
			button.click();

			expect(saveFile.mock.calls.map(call => call[1])).toEqual([
				"completr-rewind-ada-2026.png",
				"completr-rewind-ada-2026-games.png"
			]);
		});

		it("waits for a loading image and saves it once", async () => {
			const gamesImage = pendingImage();
			const { fixture, saveFile } = await renderBanner({ gamesImage });

			const button = screen.getByRole("button", { name: "Download" });
			button.click();
			button.click();
			fixture.detectChanges();

			expect(saveFile).toHaveBeenCalledTimes(1);
			expect(button).toBeDisabled();
			expect(button).toHaveAttribute("aria-busy", "true");

			gamesImage.blob.set(new Blob(["png"], { type: "image/png" }));
			gamesImage.objectUrl.set("blob:games");
			gamesImage.isLoading.set(false);
			fixture.detectChanges();
			await fixture.whenStable();
			fixture.detectChanges();

			expect(saveFile).toHaveBeenCalledTimes(2);
			expect(
				screen.getByRole("button", { name: "Download" })
			).toBeEnabled();
		});

		it("warns once when a waiting download fails", async () => {
			const gamesImage = pendingImage();
			const { fixture, toast } = await renderBanner({ gamesImage });

			screen.getByRole("button", { name: "Download" }).click();
			fixture.detectChanges();
			gamesImage.hasError.set(true);
			gamesImage.isLoading.set(false);
			fixture.detectChanges();
			await fixture.whenStable();

			expect(toast.error).toHaveBeenCalledTimes(1);
			expect(toast.error).toHaveBeenCalledWith(
				"Couldn't download the image. Try again."
			);
		});
	});

	it("copies the link once on a double click", async () => {
		const writeText = vi.fn(() => Promise.resolve());
		vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
		const { fixture, toast } = await renderBanner();

		const button = screen.getByRole("button", { name: "Copy link" });
		button.click();
		button.click();
		fixture.detectChanges();
		await fixture.whenStable();

		expect(writeText).toHaveBeenCalledTimes(1);
		expect(toast.success).toHaveBeenCalledWith("Link copied");
	});

	it("gives every action a touch-sized hit area", async () => {
		stubFileSharing();
		await renderBanner();

		for (const name of ["Share both", "Copy link", "Download"])
			expect(screen.getByRole("button", { name })).toHaveClass(
				"tap:min-h-[44px]"
			);
	});
});
