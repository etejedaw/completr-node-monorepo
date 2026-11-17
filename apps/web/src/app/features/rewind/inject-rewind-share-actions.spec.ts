import { Component, signal, type WritableSignal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { ExportService } from "../../core/services/export";
import { ToastService } from "../../core/services/toast";
import { injectRewindShareActions } from "./inject-rewind-share-actions";
import { type RewindStoryImage } from "./rewind-story-image.model";

interface ControlledImage extends RewindStoryImage {
	blob: WritableSignal<Blob | null>;
	objectUrl: WritableSignal<string | null>;
	hasError: WritableSignal<boolean>;
	isLoading: WritableSignal<boolean>;
}

function readyImage(): ControlledImage {
	return {
		target: signal({ username: "ada", year: 2026, design: "2026" }),
		blob: signal<Blob | null>(new Blob(["png"], { type: "image/png" })),
		objectUrl: signal<string | null>("blob:ready"),
		isLoading: signal(false),
		hasError: signal(false),
		request: vi.fn(),
		retry: vi.fn()
	};
}

function loadingImage(): ControlledImage {
	return {
		...readyImage(),
		blob: signal<Blob | null>(null),
		objectUrl: signal<string | null>(null),
		isLoading: signal(true)
	};
}

function finishLoading(image: ControlledImage) {
	image.blob.set(new Blob(["png"], { type: "image/png" }));
	image.objectUrl.set("blob:ready");
	image.isLoading.set(false);
}

const image = signal<RewindStoryImage>(readyImage());
const gamesImage = signal<RewindStoryImage | null>(null);

@Component({ selector: "app-share-actions-host", template: "" })
class ShareActionsHost {
	readonly actions = injectRewindShareActions({
		image: () => image(),
		gamesImage: () => gamesImage(),
		previewAlt: () => "Ada's 2026 Rewind"
	});
}

function stubFileSharing(share = vi.fn(() => Promise.resolve())) {
	vi.stubGlobal("navigator", {
		...navigator,
		canShare: vi.fn(() => true),
		share
	});
	return share;
}

function setup() {
	const toast = {
		success: vi.fn(),
		error: vi.fn(),
		warning: vi.fn()
	};
	const saveFile = vi.fn();
	TestBed.configureTestingModule({
		providers: [
			{ provide: ToastService, useValue: toast },
			{ provide: ExportService, useValue: { saveFile } }
		]
	});
	const fixture = TestBed.createComponent(ShareActionsHost);
	fixture.detectChanges();
	return {
		actions: fixture.componentInstance.actions,
		fixture,
		toast,
		saveFile
	};
}

function sharedFileNames(share: ReturnType<typeof vi.fn>): string[] {
	const [data] = share.mock.calls[0] as unknown as [{ files: File[] }];
	return data.files.map(file => file.name);
}

describe("injectRewindShareActions", () => {
	beforeEach(() => {
		image.set(readyImage());
		gamesImage.set(null);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe("pages", () => {
		it("lists only the summary when there is no games image", () => {
			const { actions } = setup();

			expect(actions.pages().map(page => page.key)).toEqual(["story"]);
			expect(actions.hasSeveralPages()).toBe(false);
			expect(actions.shareLabel()).toBe("Share image");
			expect(actions.pages()[0].downloadLabel).toBe("Download image");
		});

		it("lists the summary and the games with their own file names", () => {
			gamesImage.set(readyImage());
			const { actions } = setup();

			expect(
				actions.pages().map(page => [page.key, page.fileName])
			).toEqual([
				["story", "completr-rewind-ada-2026.png"],
				["story-list", "completr-rewind-ada-2026-games.png"]
			]);
			expect(actions.shareLabel()).toBe("Share both");
		});

		it("is ready once every image settled and at least one loaded", () => {
			const failed = readyImage();
			failed.blob.set(null);
			failed.hasError.set(true);
			const loading = loadingImage();
			image.set(readyImage());
			gamesImage.set(loading);
			const { actions } = setup();

			expect(actions.isReady()).toBe(false);

			loading.hasError.set(true);
			expect(actions.isReady()).toBe(true);

			image.set(failed);
			expect(actions.isReady()).toBe(false);
		});
	});

	describe("sharing files", () => {
		it("reports no file sharing when the browser cannot share files", () => {
			vi.stubGlobal("navigator", { ...navigator, canShare: undefined });
			const { actions } = setup();

			expect(actions.canShareFiles()).toBe(false);
		});

		it("shares both files once even when activated twice in a row", async () => {
			const share = stubFileSharing();
			gamesImage.set(readyImage());
			const { actions } = setup();

			await Promise.all([actions.shareImages(), actions.shareImages()]);

			expect(share).toHaveBeenCalledTimes(1);
			expect(sharedFileNames(share)).toEqual([
				"completr-rewind-ada-2026.png",
				"completr-rewind-ada-2026-games.png"
			]);
		});

		it("does not share while an image is still loading", async () => {
			const share = stubFileSharing();
			image.set(loadingImage());
			const { actions } = setup();

			await actions.shareImages();

			expect(share).not.toHaveBeenCalled();
		});

		it("ignores a second share while the first sheet is still open", async () => {
			let closeSheet: () => void = () => undefined;
			const share = stubFileSharing(
				vi.fn(
					() => new Promise<void>(resolve => (closeSheet = resolve))
				)
			);
			gamesImage.set(readyImage());
			const { actions } = setup();
			const [summary, games] = actions.pages();

			const first = actions.sharePage(summary);
			expect(actions.sharing()).toBe(true);
			await actions.sharePage(games);
			closeSheet();
			await first;

			expect(share).toHaveBeenCalledTimes(1);
			expect(actions.sharing()).toBe(false);
		});

		it("stays silent when the user closes the share sheet", async () => {
			stubFileSharing(
				vi.fn(() =>
					Promise.reject(new DOMException("closed", "AbortError"))
				)
			);
			const { actions, toast } = setup();

			await actions.shareImages();

			expect(toast.error).not.toHaveBeenCalled();
			expect(actions.sharing()).toBe(false);
		});

		it.each([
			[false, "Couldn't share the image. Download it instead."],
			[true, "Couldn't share the images. Download them instead."]
		])(
			"warns with the right message when sharing fails (two images: %s)",
			async (withGames, message) => {
				stubFileSharing(vi.fn(() => Promise.reject(new Error("boom"))));
				if (withGames) gamesImage.set(readyImage());
				const { actions, toast } = setup();

				await actions.shareImages();

				expect(toast.error).toHaveBeenCalledTimes(1);
				expect(toast.error).toHaveBeenCalledWith(message);
				expect(actions.sharing()).toBe(false);
			}
		);
	});

	describe("downloading", () => {
		it("saves a ready image once when downloaded twice quickly", () => {
			const { actions, saveFile } = setup();
			const [summary] = actions.pages();

			actions.download(summary);
			actions.download(summary);

			expect(saveFile).toHaveBeenCalledTimes(1);
			expect(saveFile).toHaveBeenCalledWith(
				expect.any(Blob),
				"completr-rewind-ada-2026.png"
			);
		});

		it("downloads every image at once", () => {
			gamesImage.set(readyImage());
			const { actions, saveFile } = setup();

			actions.downloadAll();
			actions.downloadAll();

			expect(saveFile.mock.calls.map(call => call[1])).toEqual([
				"completr-rewind-ada-2026.png",
				"completr-rewind-ada-2026-games.png"
			]);
		});

		it("waits for a loading image, requests it once and saves it once", () => {
			const loading = loadingImage();
			image.set(loading);
			const { actions, fixture, saveFile } = setup();
			const requestsBefore = vi.mocked(loading.request).mock.calls.length;

			actions.downloadAll();
			actions.downloadAll();
			fixture.detectChanges();

			expect(loading.request).toHaveBeenCalledTimes(requestsBefore + 1);
			expect([...actions.pendingDownloads()]).toEqual(["story"]);
			expect(saveFile).not.toHaveBeenCalled();

			finishLoading(loading);
			fixture.detectChanges();

			expect(saveFile).toHaveBeenCalledTimes(1);
			expect(actions.pendingDownloads().size).toBe(0);
		});

		it("retries a failed image on download and warns once when it fails again", () => {
			const failed = loadingImage();
			failed.isLoading.set(false);
			failed.hasError.set(true);
			image.set(failed);
			const { actions, fixture, toast, saveFile } = setup();

			actions.downloadAll();
			actions.downloadAll();
			fixture.detectChanges();

			expect(failed.retry).toHaveBeenCalledTimes(1);
			expect(toast.error).toHaveBeenCalledTimes(1);
			expect(toast.error).toHaveBeenCalledWith(
				"Couldn't download the image. Try again."
			);
			expect(saveFile).not.toHaveBeenCalled();
			expect(actions.pendingDownloads().size).toBe(0);
		});
	});

	describe("copy link", () => {
		it("copies the share link once on a double click", async () => {
			const writeText = vi.fn(() => Promise.resolve());
			vi.stubGlobal("navigator", {
				...navigator,
				clipboard: { writeText }
			});
			const { actions, toast } = setup();

			actions.copyLink();
			actions.copyLink();
			await Promise.resolve();

			expect(writeText).toHaveBeenCalledTimes(1);
			expect(toast.success).toHaveBeenCalledWith("Link copied");
		});

		it("warns when the clipboard is missing", () => {
			vi.stubGlobal("navigator", { ...navigator, clipboard: undefined });
			const { actions, toast } = setup();

			actions.copyLink();

			expect(toast.warning).toHaveBeenCalledWith(
				"Couldn't copy the link."
			);
		});

		it("warns when the clipboard refuses the write", async () => {
			vi.stubGlobal("navigator", {
				...navigator,
				clipboard: {
					writeText: vi.fn(() => Promise.reject(new Error("no")))
				}
			});
			const { actions, toast } = setup();

			actions.copyLink();
			await vi.waitFor(() => expect(toast.warning).toHaveBeenCalled());

			expect(toast.success).not.toHaveBeenCalled();
		});
	});

	describe("loading", () => {
		it("requests every image on preload and retries one on demand", () => {
			const games = loadingImage();
			gamesImage.set(games);
			const { actions } = setup();
			const [summary, gamesPage] = actions.pages();

			actions.preload();
			actions.retryPreview(gamesPage);

			expect(summary.image.request).toHaveBeenCalled();
			expect(games.request).toHaveBeenCalled();
			expect(games.retry).toHaveBeenCalledTimes(1);
			expect(summary.image.retry).not.toHaveBeenCalled();
		});
	});
});
