import "@testing-library/jest-dom/vitest";

import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { of, Subject, throwError } from "rxjs";

import { ToastService } from "../../../core/services/toast";
import { type AdminInvitation } from "../services/invitation-admin.model";
import { InvitationAdminService } from "../services/invitation-admin.service";
import { AdminInvitations } from "./admin-invitations";

const invitation = (id: string, email: string): AdminInvitation => ({
	id,
	email,
	createdAt: "2026-03-01T10:00:00.000Z",
	expiresAt: "2026-03-08T10:00:00.000Z",
	isExpired: false
});

describe("AdminInvitations interaction", () => {
	const list = vi.fn();
	const invite = vi.fn();
	const revoke = vi.fn();
	const toast = { success: vi.fn(), warning: vi.fn() };

	async function renderInvitations() {
		const view = await render(AdminInvitations, {
			providers: [
				{
					provide: InvitationAdminService,
					useValue: { list, invite, revoke }
				},
				{ provide: ToastService, useValue: toast }
			]
		});
		return view;
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
		list.mockReset().mockReturnValue(
			of([invitation("i1", "ada@example.com")])
		);
		invite
			.mockReset()
			.mockReturnValue(of(invitation("i2", "new@example.com")));
		revoke.mockReset().mockReturnValue(of(undefined));
		toast.success.mockReset();
		toast.warning.mockReset();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("sends one invitation when Send invitation is clicked repeatedly", async () => {
		const pending = new Subject<AdminInvitation>();
		invite.mockReturnValue(pending);
		const view = await renderInvitations();
		view.fixture.componentInstance.openInvite();
		view.fixture.detectChanges();
		const dialog = await screen.findByRole("dialog");
		await userEvent.type(
			within(dialog).getByLabelText("Email"),
			"new@example.com"
		);

		await userEvent.tripleClick(
			within(dialog).getByRole("button", { name: "Send invitation" })
		);

		expect(invite).toHaveBeenCalledTimes(1);
	});

	it("rejects garbage input without calling the API", async () => {
		const view = await renderInvitations();
		view.fixture.componentInstance.openInvite();
		view.fixture.detectChanges();
		const dialog = await screen.findByRole("dialog");
		await userEvent.type(
			within(dialog).getByLabelText("Email"),
			"not an email"
		);

		await userEvent.click(
			within(dialog).getByRole("button", { name: "Send invitation" })
		);

		expect(invite).not.toHaveBeenCalled();
		expect(
			await within(dialog).findByText("Email is not valid.")
		).toBeInTheDocument();
	});

	it("reloads the list when revoking an invitation that was already accepted", async () => {
		list.mockReturnValueOnce(
			of([invitation("i1", "ada@example.com")])
		).mockReturnValue(of([]));
		revoke.mockReturnValue(throwError(() => ({ status: 404 })));
		await renderInvitations();

		await userEvent.click(
			await screen.findByRole("button", { name: "Revoke" })
		);
		await userEvent.click(screen.getByRole("button", { name: "Revoke" }));

		await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
		expect(toast.warning).toHaveBeenCalledWith(
			"Could not revoke the invitation."
		);
	});

	it("keeps the newest list when an older load answers last", async () => {
		const older = new Subject<AdminInvitation[]>();
		const view = await renderInvitations();
		list.mockReset()
			.mockReturnValueOnce(older)
			.mockReturnValueOnce(of([invitation("i9", "newer@example.com")]));

		view.fixture.componentInstance["loadInvitations"]();
		view.fixture.componentInstance["loadInvitations"]();
		older.next([invitation("i0", "stale@example.com")]);
		view.fixture.detectChanges();

		expect(screen.getByText("newer@example.com")).toBeInTheDocument();
		expect(screen.queryByText("stale@example.com")).not.toBeInTheDocument();
	});
});
