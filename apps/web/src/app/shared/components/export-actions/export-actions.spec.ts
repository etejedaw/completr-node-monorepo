import "@testing-library/jest-dom/vitest";

import { signal } from "@angular/core";
import { render, screen, waitFor } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { type Observable, Subject, throwError } from "rxjs";

import { AuthService } from "../../../core/services/auth";
import {
	type ExportFormat,
	type ExportResource,
	ExportService
} from "../../../core/services/export";
import { ToastService } from "../../../core/services/toast";
import { QueueBrowser } from "../../../features/queue/queue-browser/queue-browser";
import { ExportActions } from "./export-actions";

describe("ExportActions", () => {
	const isPremium = signal(false);
	let pending: Map<ExportFormat, Subject<void>>;
	const exportService = {
		download: vi.fn(
			(
				_resource: ExportResource,
				format: ExportFormat
			): Observable<void> => {
				const download = new Subject<void>();
				pending.set(format, download);
				return download;
			}
		)
	};
	const toast = { error: vi.fn() };

	function providers() {
		return [
			{ provide: AuthService, useValue: { isPremium } },
			{ provide: ExportService, useValue: exportService },
			{ provide: ToastService, useValue: toast }
		];
	}

	async function renderActions(resource: ExportResource = "backlog") {
		return render(ExportActions, {
			inputs: { resource, label: "My Games" },
			providers: providers()
		});
	}

	function finish(format: ExportFormat) {
		const download = pending.get(format)!;
		download.next();
		download.complete();
	}

	beforeEach(() => {
		isPremium.set(false);
		pending = new Map();
		exportService.download.mockClear();
		toast.error.mockReset();
	});

	it("shows only the CSV button to free users", async () => {
		await renderActions();

		const csv = screen.getByRole("button", {
			name: "Download My Games as CSV"
		});
		expect(csv).toHaveTextContent("CSV");
		expect(csv).toHaveAttribute("title", "Download My Games as CSV");
		expect(
			screen.queryByRole("button", { name: "Download My Games as JSON" })
		).not.toBeInTheDocument();
	});

	it("shows the JSON button in gold to premium users", async () => {
		isPremium.set(true);
		await renderActions();

		expect(
			screen.getByRole("button", { name: "Download My Games as CSV" })
		).toHaveAttribute("data-variant", "secondary");
		expect(
			screen.getByRole("button", { name: "Download My Games as JSON" })
		).toHaveAttribute("data-variant", "premium");
	});

	it("disables the button while it downloads and keeps the other one active", async () => {
		const user = userEvent.setup();
		isPremium.set(true);
		await renderActions({ listId: "list-1" });
		const csv = screen.getByRole("button", {
			name: "Download My Games as CSV"
		});
		const json = screen.getByRole("button", {
			name: "Download My Games as JSON"
		});

		await user.click(csv);
		await user.click(csv);

		expect(exportService.download).toHaveBeenCalledTimes(1);
		expect(exportService.download).toHaveBeenCalledWith(
			{ listId: "list-1" },
			"csv"
		);
		expect(csv).toBeDisabled();
		expect(csv).toHaveAttribute("aria-busy", "true");
		expect(json).not.toBeDisabled();
		expect(json).not.toHaveAttribute("aria-busy");

		finish("csv");
		await waitFor(() => expect(csv).not.toBeDisabled());
		expect(csv).not.toHaveAttribute("aria-busy");
	});

	it("shows an error toast when the download fails for an unhandled reason", async () => {
		const user = userEvent.setup();
		exportService.download.mockReturnValueOnce(
			throwError(() => ({ status: 500 }))
		);
		await renderActions();

		await user.click(
			screen.getByRole("button", { name: "Download My Games as CSV" })
		);

		expect(toast.error).toHaveBeenCalledWith(
			"Could not download My Games. Please try again."
		);
		expect(
			screen.getByRole("button", { name: "Download My Games as CSV" })
		).not.toBeDisabled();
	});

	it("leaves the plan limit toast to the interceptor on a 402", async () => {
		const user = userEvent.setup();
		isPremium.set(true);
		exportService.download.mockReturnValueOnce(
			throwError(() => ({ status: 402 }))
		);
		await renderActions();

		await user.click(
			screen.getByRole("button", { name: "Download My Games as JSON" })
		);

		expect(toast.error).not.toHaveBeenCalled();
	});

	describe("in Up Next", () => {
		beforeEach(() => {
			vi.stubGlobal(
				"matchMedia",
				vi.fn(() => ({
					matches: false,
					addEventListener: vi.fn(),
					removeEventListener: vi.fn()
				}))
			);
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		async function renderQueue(inputs: Record<string, unknown>) {
			return render(QueueBrowser, {
				inputs: {
					searchPlaceholder: "Search your queue...",
					noMatchesScope: "Up Next",
					entries: [],
					queueIsEmpty: false,
					searchQuery: "",
					offset: 0,
					limit: 20,
					total: 0,
					...inputs
				},
				providers: providers()
			});
		}

		it("offers the export on the own queue once it has loaded", async () => {
			await renderQueue({ isLoading: false });

			expect(
				screen.getByRole("button", { name: "Download Up Next as CSV" })
			).toBeInTheDocument();
		});

		it("hides the export while the queue loads", async () => {
			await renderQueue({ isLoading: true });

			expect(
				screen.queryByRole("button", {
					name: "Download Up Next as CSV"
				})
			).not.toBeInTheDocument();
		});

		it("hides the export on a public queue", async () => {
			await renderQueue({ isLoading: false, readonly: true });

			expect(
				screen.queryByRole("button", {
					name: "Download Up Next as CSV"
				})
			).not.toBeInTheDocument();
		});
	});
});
