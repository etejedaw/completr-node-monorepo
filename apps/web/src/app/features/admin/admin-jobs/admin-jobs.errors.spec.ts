import "@testing-library/jest-dom/vitest";

import { render, screen, waitFor } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { of, Subject, throwError } from "rxjs";

import { ToastService } from "../../../core/services/toast";
import { type JobEntry } from "../services/jobs.model";
import { JobsService } from "../services/jobs.service";
import { AdminJobs } from "./admin-jobs";

const running: JobEntry = {
	id: "j1",
	type: "populate_rawg",
	status: "running",
	createdAt: "2026-03-01T10:00:00.000Z"
};

const finished: JobEntry = { ...running, status: "completed" };

describe("AdminJobs errors and ordering", () => {
	const getJobs = vi.fn();
	const cancelJob = vi.fn();
	const startPopulateRawg = vi.fn();
	const toast = { warning: vi.fn() };

	function renderJobs() {
		return render(AdminJobs, {
			providers: [
				{
					provide: JobsService,
					useValue: { getJobs, cancelJob, startPopulateRawg }
				},
				{ provide: ToastService, useValue: toast }
			]
		});
	}

	beforeEach(() => {
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: false,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}))
		);
		getJobs.mockReset().mockReturnValue(of([running]));
		cancelJob.mockReset();
		startPopulateRawg.mockReset();
		toast.warning.mockReset();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("reloads the list when cancelling a job that no longer exists", async () => {
		getJobs
			.mockReturnValueOnce(of([running]))
			.mockReturnValue(of([finished]));
		cancelJob.mockReturnValue(
			throwError(() => ({
				status: 404,
				error: { type: "JOB_NOT_FOUND", title: "Job not found" }
			}))
		);
		await renderJobs();

		const [cancel] = await screen.findAllByRole("button", {
			name: "Cancel"
		});
		await userEvent.click(cancel!);

		await waitFor(() => expect(getJobs).toHaveBeenCalledTimes(2));
		expect(toast.warning).toHaveBeenCalledWith(
			"Couldn't cancel the job. It may have already finished."
		);
		await waitFor(() =>
			expect(
				screen.queryByRole("button", { name: "Cancel" })
			).not.toBeInTheDocument()
		);
	});

	it("does not reload the list after a server error while cancelling", async () => {
		cancelJob.mockReturnValue(throwError(() => ({ status: 500 })));
		await renderJobs();

		const [cancel] = await screen.findAllByRole("button", {
			name: "Cancel"
		});
		await userEvent.click(cancel!);

		expect(toast.warning).toHaveBeenCalledTimes(1);
		expect(getJobs).toHaveBeenCalledTimes(1);
	});

	it("keeps the newest list when an older reload answers last", async () => {
		const older = new Subject<JobEntry[]>();
		getJobs
			.mockReturnValueOnce(of([running]))
			.mockReturnValueOnce(older)
			.mockReturnValueOnce(of([finished]));
		await renderJobs();

		await userEvent.click(screen.getByRole("button", { name: "Refresh" }));
		await userEvent.click(screen.getByRole("button", { name: "Refresh" }));
		older.next([running]);

		expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
	});
});
