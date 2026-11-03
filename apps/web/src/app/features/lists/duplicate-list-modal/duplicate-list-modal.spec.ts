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
import { type List } from "../../../core/models";
import { DuplicateListModal } from "./duplicate-list-modal";

const source = { id: "list-9", name: "Cozy games", isPublic: true } as List;

const dialogRef = vi.hoisted(() => ({
	data: {} as { list: unknown },
	config: { role: "dialog", modal: true },
	disableClose: false,
	close: vi.fn()
}));

describe("DuplicateListModal", () => {
	const duplicateUrl = `${environment.apiUrl}/lists/${source.id}/duplicate`;
	let httpTesting: HttpTestingController;

	async function renderModal() {
		dialogRef.data = { list: source };
		const view = await render(DuplicateListModal, {
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

	it("starts private with a suggested name", async () => {
		await renderModal();

		expect(screen.getByLabelText("Name")).toHaveValue("Cozy games (copy)");
		expect(screen.getByText("Private list")).toBeInTheDocument();
	});

	it("switches between private and public with the checkbox", async () => {
		const user = userEvent.setup();
		await renderModal();

		await user.click(screen.getByText("Private list"));
		expect(screen.getByText("Public list")).toBeInTheDocument();

		await user.click(screen.getByText("Public list"));
		expect(screen.getByText("Private list")).toBeInTheDocument();
	});

	it("lands on the starting state after an even number of rapid clicks", async () => {
		const user = userEvent.setup();
		await renderModal();

		await user.tripleClick(screen.getByText("Private list"));
		expect(screen.getByText("Public list")).toBeInTheDocument();

		await user.dblClick(screen.getByText("Public list"));
		expect(screen.getByText("Public list")).toBeInTheDocument();
	});

	it("sends the chosen visibility and closes with the new list", async () => {
		const user = userEvent.setup();
		await renderModal();

		await user.click(screen.getByText("Private list"));
		await user.click(screen.getByRole("button", { name: "Duplicate" }));

		const request = httpTesting.expectOne(duplicateUrl);
		expect(request.request.body).toEqual({
			name: "Cozy games (copy)",
			isPublic: true
		});
		request.flush({ data: { list: { id: "list-10" } } });
		expect(dialogRef.close).toHaveBeenCalledWith({ id: "list-10" });
	});

	it("sends a single request when Duplicate is hammered while it is pending", async () => {
		const user = userEvent.setup();
		await renderModal();

		const duplicate = screen.getByRole("button", { name: "Duplicate" });
		await user.dblClick(duplicate);
		await user.keyboard("{Enter}");

		httpTesting.expectOne(duplicateUrl);
		expect(
			screen.getByRole("button", { name: "Duplicating..." })
		).toBeDisabled();
		expect(dialogRef.close).not.toHaveBeenCalled();
	});

	it("keeps Duplicate disabled for a blank name and sends nothing on Enter", async () => {
		const user = userEvent.setup();
		await renderModal();

		await user.clear(screen.getByLabelText("Name"));
		await user.keyboard("{Enter}");

		expect(
			screen.getByRole("button", { name: "Duplicate" })
		).toBeDisabled();
		httpTesting.expectNone(duplicateUrl);
	});

	it("shows the server error and lets the user try again", async () => {
		const user = userEvent.setup();
		await renderModal();

		await user.click(screen.getByRole("button", { name: "Duplicate" }));
		httpTesting
			.expectOne(duplicateUrl)
			.flush(
				{ title: "List limit reached" },
				{ status: 402, statusText: "Payment Required" }
			);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"List limit reached"
		);
		expect(screen.getByRole("button", { name: "Duplicate" })).toBeEnabled();
	});

	it("closes with nothing when Cancel is pressed", async () => {
		const user = userEvent.setup();
		await renderModal();

		await user.click(screen.getByRole("button", { name: "Cancel" }));

		expect(dialogRef.close).toHaveBeenCalledWith(null);
		httpTesting.expectNone(duplicateUrl);
	});
});
