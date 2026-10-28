import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { render, screen } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { NgpDialogRef } from "ng-primitives/dialog";
import { provideExitAnimationManager } from "ng-primitives/internal";

import { environment } from "../../../../environments/environment";
import { AdminFranchiseModal } from "./admin-franchise-modal";

const dialogRef = vi.hoisted(() => ({
	data: { franchise: null } as { franchise: unknown },
	config: { role: "dialog", modal: true },
	disableClose: false,
	close: vi.fn()
}));

describe("AdminFranchiseModal", () => {
	const franchisesUrl = `${environment.apiUrl}/franchises`;
	let httpTesting: HttpTestingController;

	async function renderModal(franchise: unknown = null) {
		dialogRef.data = { franchise };
		const view = await render(AdminFranchiseModal, {
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				provideExitAnimationManager(),
				{ provide: NgpDialogRef, useValue: dialogRef }
			]
		});
		httpTesting = view.fixture.debugElement.injector.get(
			HttpTestingController
		);
		return view;
	}

	beforeEach(() => {
		dialogRef.close.mockClear();
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
		httpTesting?.verify();
		vi.unstubAllGlobals();
	});

	it("creates a franchise with a single request and closes", async () => {
		const user = userEvent.setup();
		await renderModal();

		await user.type(screen.getByLabelText(/name/i), "Zelda");
		await user.click(screen.getByRole("button", { name: /create|save/i }));

		const req = httpTesting.expectOne(franchisesUrl);
		expect(req.request.method).toBe("POST");
		expect(req.request.body).toEqual({
			name: "Zelda",
			description: null,
			gameIds: []
		});
		req.flush({ data: { franchise: { id: "f1" } } });
		expect(dialogRef.close).toHaveBeenCalledWith("saved");
	});

	it("shows the duplicated name message and stays open on 409", async () => {
		const user = userEvent.setup();
		await renderModal();

		await user.type(screen.getByLabelText(/name/i), "Zelda");
		await user.click(screen.getByRole("button", { name: /create|save/i }));

		httpTesting
			.expectOne(franchisesUrl)
			.flush({}, { status: 409, statusText: "Conflict" });

		expect(
			await screen.findByText(/franchise with that name already exists/i)
		).toBeInTheDocument();
		expect(dialogRef.close).not.toHaveBeenCalled();
	});

	it("sends the final games in a single PATCH when editing", async () => {
		const user = userEvent.setup();
		await renderModal({ id: "f1", name: "Zelda", code: "zelda" });

		httpTesting
			.expectOne(r => r.url === `${franchisesUrl}/zelda`)
			.flush({
				data: {
					franchise: { id: "f1", name: "Zelda", code: "zelda" },
					games: [
						{ id: "g1", title: "Ocarina" },
						{ id: "g2", title: "Majora" }
					],
					gameCount: 2,
					isTracked: false,
					hasMore: false
				}
			});
		await screen.findByText("Ocarina");
		await user.click(
			(await screen.findAllByRole("button", { name: /remove/i }))[1]
		);
		await user.click(screen.getByRole("button", { name: /save/i }));

		const req = httpTesting.expectOne(`${franchisesUrl}/f1`);
		expect(req.request.method).toBe("PATCH");
		expect(req.request.body).toEqual({
			name: "Zelda",
			description: null,
			gameIds: ["g1"]
		});
		req.flush({ data: { franchise: { id: "f1" } } });
		expect(dialogRef.close).toHaveBeenCalledWith("saved");
	});
});
