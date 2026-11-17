import "@testing-library/jest-dom/vitest";

import { signal, type WritableSignal } from "@angular/core";
import { render, screen, within } from "@testing-library/angular";

import { ExportService } from "../../../../core/services/export";
import { ToastService } from "../../../../core/services/toast";
import { type RewindStoryImage } from "../../rewind-story-image.model";
import { RewindShareActions } from "./rewind-share-actions";

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

function stubFileSharing(share = vi.fn(() => Promise.resolve())) {
	vi.stubGlobal("navigator", {
		...navigator,
		canShare: vi.fn(() => true),
		share
	});
	return share;
}

interface RenderOptions {
	image?: RewindStoryImage;
	gamesImage?: RewindStoryImage | null;
	toast?: {
		success: ReturnType<typeof vi.fn>;
		error: ReturnType<typeof vi.fn>;
	};
	saveFile?: ReturnType<typeof vi.fn>;
}

async function renderShare({
	image = storyImage(),
	gamesImage = null,
	toast = { success: vi.fn(), error: vi.fn() },
	saveFile = vi.fn()
}: RenderOptions = {}) {
	const view = await render(RewindShareActions, {
		inputs: {
			image,
			gamesImage,
			previewAlt: "Rewind 2026 story"
		},
		providers: [
			{ provide: ToastService, useValue: toast },
			{ provide: ExportService, useValue: { saveFile } }
		]
	});
	return { ...view, toast, saveFile };
}

function sharedFileNames(share: ReturnType<typeof vi.fn>): string[] {
	const [data] = share.mock.calls[0] as unknown as [{ files: File[] }];
	return data.files.map(file => file.name);
}

describe("RewindShareActions gallery", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("shows both images at once with their own download buttons", async () => {
		await renderShare({ gamesImage: storyImage("blob:games") });

		expect(
			screen.getByRole("img", { name: "Rewind 2026 story" })
		).toBeInTheDocument();
		expect(
			screen.getByRole("img", {
				name: "Rewind 2026 story: finished games"
			})
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Download summary" })
		).toBeEnabled();
		expect(
			screen.getByRole("button", { name: "Download games" })
		).toBeEnabled();
		expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
		expect(screen.getByRole("group", { name: "Story images" })).toHaveClass(
			"grid-cols-2"
		);
	});

	it("names each image in its own bar", async () => {
		await renderShare({ gamesImage: storyImage("blob:games") });

		const figures = screen.getAllByRole("figure");
		expect(figures).toHaveLength(2);
		expect(within(figures[0]).getByText("Summary")).toBeInTheDocument();
		expect(within(figures[1]).getByText("Games")).toBeInTheDocument();
	});

	it("centres a single summary image with the same bar and no per-image share", async () => {
		stubFileSharing();
		await renderShare();

		expect(screen.getAllByRole("figure")).toHaveLength(1);
		expect(screen.getByRole("group", { name: "Story images" })).toHaveClass(
			"grid-cols-1",
			"mx-auto"
		);
		expect(
			screen.getByRole("button", { name: "Download image" })
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Share summary image" })
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Share image" })
		).toBeInTheDocument();
	});

	it("makes Copy link the main action and offers no share buttons without file sharing", async () => {
		await renderShare({ gamesImage: storyImage("blob:games") });

		expect(
			screen.queryByRole("button", { name: /Share/ })
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Copy link" })
		).toHaveAttribute("data-variant", "primary");
		expect(
			screen.getByRole("button", { name: "Download summary" })
		).toBeInTheDocument();
	});

	it("pairs Share both with a secondary Copy link when files can be shared", async () => {
		stubFileSharing();
		await renderShare({ gamesImage: storyImage("blob:games") });

		expect(
			screen.getByRole("button", { name: "Share both" })
		).toHaveAttribute("data-variant", "primary");
		expect(
			screen.getByRole("button", { name: "Copy link" })
		).toHaveAttribute("data-variant", "secondary");
		expect(
			screen.getByRole("button", { name: "Share summary image" })
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Share games image" })
		).toBeInTheDocument();
	});

	it("keeps every action visible with a touch-sized hit area class on the row", async () => {
		stubFileSharing();
		await renderShare({ gamesImage: storyImage("blob:games") });

		for (const name of ["Share both", "Copy link"])
			expect(screen.getByRole("button", { name })).toHaveClass(
				"tap:min-h-[44px]"
			);
		for (const name of ["Download summary", "Share games image"])
			expect(screen.getByRole("button", { name }).className).not.toMatch(
				/hidden|opacity-0|group-hover/
			);
	});
});

describe("RewindShareActions sharing", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("shares exactly the file of the image whose button was pressed", async () => {
		const share = stubFileSharing();
		const { fixture } = await renderShare({
			gamesImage: storyImage("blob:games")
		});

		screen.getByRole("button", { name: "Share games image" }).click();
		fixture.detectChanges();
		await fixture.whenStable();

		expect(share).toHaveBeenCalledTimes(1);
		expect(sharedFileNames(share)).toEqual([
			"completr-rewind-ada-2026-games.png"
		]);
	});

	it("shares both files with Share both", async () => {
		const share = stubFileSharing();
		const { fixture } = await renderShare({
			gamesImage: storyImage("blob:games")
		});

		screen.getByRole("button", { name: "Share both" }).click();
		fixture.detectChanges();
		await fixture.whenStable();

		expect(share).toHaveBeenCalledTimes(1);
		expect(sharedFileNames(share)).toHaveLength(2);
	});

	it("shares only once when a share button is double clicked", async () => {
		const share = stubFileSharing();
		const { fixture } = await renderShare({
			gamesImage: storyImage("blob:games")
		});

		const button = screen.getByRole("button", { name: "Share both" });
		button.click();
		button.click();
		fixture.detectChanges();
		await fixture.whenStable();

		expect(share).toHaveBeenCalledTimes(1);
	});

	it("disables every share button while a share is in progress", async () => {
		let finishShare: () => void = () => undefined;
		stubFileSharing(
			vi.fn(() => new Promise<void>(resolve => (finishShare = resolve)))
		);
		const { fixture } = await renderShare({
			gamesImage: storyImage("blob:games")
		});

		screen.getByRole("button", { name: "Share summary image" }).click();
		fixture.detectChanges();

		expect(
			screen.getByRole("button", { name: "Share both" })
		).toBeDisabled();
		expect(
			screen.getByRole("button", { name: "Share games image" })
		).toBeDisabled();
		finishShare();
		await fixture.whenStable();
		fixture.detectChanges();
		expect(
			screen.getByRole("button", { name: "Share both" })
		).toBeEnabled();
	});

	it("stays silent when the user dismisses the share sheet", async () => {
		const share = stubFileSharing(
			vi.fn(() =>
				Promise.reject(new DOMException("closed", "AbortError"))
			)
		);
		const { fixture, toast } = await renderShare({
			gamesImage: storyImage("blob:games")
		});

		screen.getByRole("button", { name: "Share summary image" }).click();
		fixture.detectChanges();
		await fixture.whenStable();

		expect(share).toHaveBeenCalledTimes(1);
		expect(toast.error).not.toHaveBeenCalled();
	});

	it("warns once with the single-image message when sharing one image fails", async () => {
		stubFileSharing(vi.fn(() => Promise.reject(new Error("boom"))));
		const { fixture, toast } = await renderShare({
			gamesImage: storyImage("blob:games")
		});

		screen.getByRole("button", { name: "Share games image" }).click();
		fixture.detectChanges();
		await fixture.whenStable();

		expect(toast.error).toHaveBeenCalledTimes(1);
		expect(toast.error).toHaveBeenCalledWith(
			"Couldn't share the image. Download it instead."
		);
	});

	it("keeps sharing disabled for an image that is still loading", async () => {
		stubFileSharing();
		await renderShare({ gamesImage: pendingImage() });

		expect(
			screen.getByRole("button", { name: "Share games image" })
		).toBeDisabled();
		expect(
			screen.getByRole("button", { name: "Share both" })
		).toBeDisabled();
		expect(
			screen.getByRole("button", { name: "Share summary image" })
		).toBeEnabled();
	});
});

describe("RewindShareActions images", () => {
	it("shows a skeleton while an image loads and requests it once in view", async () => {
		const gamesImage = pendingImage();
		await renderShare({ gamesImage });

		const figure = screen.getAllByRole("figure")[1];
		expect(figure).toHaveAttribute("aria-busy", "true");
		expect(
			within(figure).getByText("Preparing the image")
		).toBeInTheDocument();
		expect(within(figure).queryByRole("img")).not.toBeInTheDocument();
	});

	it("shows an error on the failed image only and retries it", async () => {
		const gamesImage = pendingImage();
		gamesImage.isLoading.set(false);
		gamesImage.hasError.set(true);
		const { fixture } = await renderShare({ gamesImage });

		const figures = screen.getAllByRole("figure");
		expect(
			within(figures[0]).queryByText("Couldn't load the image.")
		).not.toBeInTheDocument();
		expect(
			within(figures[1]).getByText("Couldn't load the image.")
		).toBeInTheDocument();

		const retry = within(figures[1]).getByRole("button", {
			name: "Try again"
		});
		retry.click();
		retry.click();
		fixture.detectChanges();

		expect(gamesImage.retry).toHaveBeenCalled();
	});

	it("saves right away a download of an image that is ready", async () => {
		const { saveFile } = await renderShare({
			gamesImage: storyImage("blob:games")
		});

		screen.getByRole("button", { name: "Download games" }).click();

		expect(saveFile).toHaveBeenCalledTimes(1);
		expect(saveFile).toHaveBeenCalledWith(
			expect.any(Blob),
			"completr-rewind-ada-2026-games.png"
		);
	});

	it("waits for a loading image on download and saves it once, ignoring a double click", async () => {
		const gamesImage = pendingImage();
		const { fixture, saveFile } = await renderShare({ gamesImage });

		const button = screen.getByRole("button", { name: "Download games" });
		const requestsBefore = vi.mocked(gamesImage.request).mock.calls.length;
		button.click();
		button.click();
		fixture.detectChanges();

		expect(gamesImage.request).toHaveBeenCalledTimes(requestsBefore + 1);
		expect(button).toBeDisabled();
		expect(button).toHaveAttribute("aria-busy", "true");
		expect(saveFile).not.toHaveBeenCalled();

		gamesImage.blob.set(new Blob(["png"], { type: "image/png" }));
		gamesImage.objectUrl.set("blob:games");
		gamesImage.isLoading.set(false);
		fixture.detectChanges();
		await fixture.whenStable();

		expect(saveFile).toHaveBeenCalledTimes(1);
		expect(
			screen.getByRole("button", { name: "Download games" })
		).toBeEnabled();
	});

	it("warns once when a download waits for an image that fails, and ignores a double click", async () => {
		const gamesImage = pendingImage();
		const { fixture, toast } = await renderShare({ gamesImage });

		const button = screen.getByRole("button", { name: "Download games" });
		const requestsBefore = vi.mocked(gamesImage.request).mock.calls.length;
		button.click();
		button.click();
		fixture.detectChanges();
		expect(gamesImage.request).toHaveBeenCalledTimes(requestsBefore + 1);

		gamesImage.hasError.set(true);
		gamesImage.isLoading.set(false);
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

describe("RewindShareActions copy link", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("copies the share link once on a double click", async () => {
		const writeText = vi.fn(() => Promise.resolve());
		vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
		const { fixture, toast } = await renderShare();

		const button = screen.getByRole("button", { name: "Copy link" });
		button.click();
		button.click();
		fixture.detectChanges();
		await fixture.whenStable();

		expect(writeText).toHaveBeenCalledTimes(1);
		expect(toast.success).toHaveBeenCalledWith("Link copied");
	});
});
