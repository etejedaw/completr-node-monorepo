import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { environment } from "../../../../environments/environment";
import { type AdminUser } from "../services/user-admin.model";
import { AdminPremiumAccess } from "./admin-premium-access";

const api = environment.apiUrl;
const USER: AdminUser = {
	id: "u1",
	username: "ada",
	email: "ada@example.com",
	name: "Ada Lovelace",
	role: "user",
	isActive: true,
	profileVisibility: "public",
	createdAt: "2026-01-01T00:00:00.000Z"
};
const FEATURES = [
	{
		feature: "lists.unlimited",
		allowsExpiration: true,
		allowsGlobalGrant: true
	},
	{ feature: "export.json", allowsExpiration: true, allowsGlobalGrant: true }
];

function grant(overrides: Record<string, unknown> = {}) {
	return {
		id: "g1",
		userId: "u1",
		feature: "lists.unlimited",
		expiresAt: null,
		offerCode: null,
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
		...overrides
	};
}

describe("AdminPremiumAccess interaction", () => {
	let http: HttpTestingController;

	beforeEach(() => {
		vi.stubGlobal("matchMedia", (query: string) => ({
			matches: false,
			media: query,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn()
		}));
	});

	afterEach(() => {
		http.match(() => true).forEach(req => {
			if (!req.cancelled) req.flush(null);
		});
		vi.unstubAllGlobals();
	});

	async function renderDialog(grants: unknown[] = []) {
		const view = await render(AdminPremiumAccess, {
			inputs: { user: USER },
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		http = TestBed.inject(HttpTestingController);
		http.expectOne(`${api}/admin/users/u1/premium-grants`).flush({
			data: { grants }
		});
		http.expectOne(`${api}/admin/premium-features`).flush({
			data: { features: FEATURES }
		});
		view.fixture.detectChanges();
		return view;
	}

	it("shows empty sections and creates a permanent individual grant", async () => {
		const user = userEvent.setup();
		const view = await renderDialog();
		const dialog = await screen.findByRole("dialog", {
			name: "Premium access"
		});
		expect(
			within(dialog).getByText("No individual grants")
		).toBeInTheDocument();
		expect(
			within(dialog).getByText("No full-premium grants yet.")
		).toBeInTheDocument();

		await user.click(
			within(dialog).getByRole("button", { name: "Grant feature" })
		);
		const req = http.expectOne(`${api}/admin/users/u1/premium-grants`);
		expect(req.request.body).toEqual({
			feature: "lists.unlimited",
			expiresAt: null
		});
		req.flush({ data: { grant: grant() } });
		view.fixture.detectChanges();
		expect(
			await within(dialog).findByText("Premium access granted.")
		).toBeInTheDocument();
		expect(within(dialog).getByText("No expiration")).toBeInTheDocument();
	});

	it("requires a date for full premium and submits an ISO expiration", async () => {
		const user = userEvent.setup();
		const view = await renderDialog();
		const dialog = await screen.findByRole("dialog", {
			name: "Premium access"
		});
		const date = within(dialog).getByLabelText("Expires at", {
			selector: "#full-premium-expiration"
		});
		await user.clear(date);
		await user.click(
			within(dialog).getByRole("button", { name: "Grant full premium" })
		);
		expect(
			await within(dialog).findAllByText(
				"Full premium requires an expiration date."
			)
		).toHaveLength(2);

		await user.type(date, "2027-02-01T12:30");
		await user.click(
			within(dialog).getByRole("button", { name: "Grant full premium" })
		);
		const req = http.expectOne(`${api}/admin/users/u1/premium-grants`);
		expect(req.request.body.feature).toBe("*");
		expect(req.request.body.expiresAt).toBe(
			new Date("2027-02-01T12:30").toISOString()
		);
		req.flush({
			data: {
				grant: grant({
					id: "full",
					feature: "*",
					expiresAt: req.request.body.expiresAt
				})
			}
		});
		view.fixture.detectChanges();
		expect(
			within(dialog).getByText("Full premium", { selector: "strong" })
		).toBeInTheDocument();
	});

	it("extends and revokes an existing grant", async () => {
		const user = userEvent.setup();
		const view = await renderDialog([grant()]);
		const dialog = await screen.findByRole("dialog", {
			name: "Premium access"
		});
		const date = within(dialog).getByLabelText("New expiration");
		await user.type(date, "2027-03-01T10:00");
		await user.click(
			within(dialog).getByRole("button", { name: "Save date" })
		);
		const update = http.expectOne(
			`${api}/admin/users/u1/premium-grants/g1`
		);
		expect(update.request.method).toBe("PATCH");
		expect(update.request.body.expiresAt).toBe(
			new Date("2027-03-01T10:00").toISOString()
		);
		update.flush({
			data: { grant: grant({ expiresAt: update.request.body.expiresAt }) }
		});
		view.fixture.detectChanges();

		await user.click(
			within(dialog).getByRole("button", { name: "Revoke" })
		);
		const revoke = http.expectOne(
			`${api}/admin/users/u1/premium-grants/g1/revoke`
		);
		expect(revoke.request.method).toBe("POST");
		revoke.flush({
			data: { grant: grant({ expiresAt: "2026-10-31T00:00:00.000Z" }) }
		});
		view.fixture.detectChanges();
		await waitFor(() =>
			expect(within(dialog).getByText("Expired")).toBeInTheDocument()
		);
		expect(
			within(dialog).getByText("Premium access revoked.")
		).toBeInTheDocument();
	});

	it("shows the origin of an offer grant", async () => {
		await renderDialog([grant({ offerCode: "lists-trial-1m" })]);
		const dialog = await screen.findByRole("dialog", {
			name: "Premium access"
		});
		expect(dialog).toHaveTextContent("Offer: lists-trial-1m");
	});

	it("shows full-premium access inherited from the permanent role", async () => {
		const view = await render(AdminPremiumAccess, {
			inputs: { user: { ...USER, role: "premium" } },
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		http = TestBed.inject(HttpTestingController);
		http.expectOne(`${api}/admin/users/u1/premium-grants`).flush({
			data: { grants: [] }
		});
		http.expectOne(`${api}/admin/premium-features`).flush({
			data: { features: FEATURES }
		});
		view.fixture.detectChanges();
		const dialog = await screen.findByRole("dialog", {
			name: "Premium access"
		});
		expect(dialog).toHaveTextContent(
			"Active through the permanent premium role"
		);
	});

	it("requires confirmation before revoking full premium", async () => {
		const user = userEvent.setup();
		const view = await renderDialog([
			grant({ feature: "*", expiresAt: "2027-01-01T00:00:00.000Z" })
		]);
		const dialog = await screen.findByRole("dialog", {
			name: "Premium access"
		});
		await user.click(
			within(dialog).getByRole("button", { name: "Revoke" })
		);
		expect(
			http.match(request => request.url.endsWith("/revoke"))
		).toHaveLength(0);
		await user.click(
			within(dialog).getByRole("button", { name: "Confirm revoke" })
		);
		const request = http.expectOne(
			`${api}/admin/users/u1/premium-grants/g1/revoke`
		);
		request.flush({
			data: {
				grant: grant({
					feature: "*",
					expiresAt: "2026-10-31T00:00:00.000Z"
				})
			}
		});
		view.fixture.detectChanges();
		expect(
			within(dialog).getByText("Premium access revoked.")
		).toBeInTheDocument();
	});

	it("sends only one create request for a double click", async () => {
		const user = userEvent.setup();
		await renderDialog();
		const dialog = await screen.findByRole("dialog", {
			name: "Premium access"
		});
		await user.dblClick(
			within(dialog).getByRole("button", { name: "Grant feature" })
		);
		expect(
			http.match(
				request =>
					request.method === "POST" &&
					request.url === `${api}/admin/users/u1/premium-grants`
			)
		).toHaveLength(1);
	});

	it("ignores a mutation response after the dialog is destroyed", async () => {
		const user = userEvent.setup();
		const view = await renderDialog();
		const dialog = await screen.findByRole("dialog", {
			name: "Premium access"
		});
		await user.click(
			within(dialog).getByRole("button", { name: "Grant feature" })
		);
		const request = http.expectOne(`${api}/admin/users/u1/premium-grants`);
		view.fixture.destroy();
		expect(() => request.flush({ data: { grant: grant() } })).not.toThrow();
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("does not let an older load replace newer grants", async () => {
		const view = await render(AdminPremiumAccess, {
			inputs: { user: USER },
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		http = TestBed.inject(HttpTestingController);
		const oldGrants = http.expectOne(
			`${api}/admin/users/u1/premium-grants`
		);
		const oldFeatures = http.expectOne(`${api}/admin/premium-features`);
		view.fixture.componentInstance["load"]();
		http.expectOne(`${api}/admin/users/u1/premium-grants`).flush({
			data: { grants: [grant({ id: "new", offerCode: "new-offer" })] }
		});
		http.expectOne(`${api}/admin/premium-features`).flush({
			data: { features: FEATURES }
		});
		view.fixture.detectChanges();
		oldGrants.flush({
			data: { grants: [grant({ id: "old", offerCode: "old-offer" })] }
		});
		oldFeatures.flush({ data: { features: [] } });
		view.fixture.detectChanges();
		const dialog = await screen.findByRole("dialog", {
			name: "Premium access"
		});
		expect(dialog).toHaveTextContent("new-offer");
		expect(dialog).not.toHaveTextContent("old-offer");
	});

	it("shows a retryable loading error", async () => {
		await render(AdminPremiumAccess, {
			inputs: { user: USER },
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		http = TestBed.inject(HttpTestingController);
		http.expectOne(`${api}/admin/users/u1/premium-grants`).flush(
			{ title: "Failed" },
			{ status: 500, statusText: "Error" }
		);
		const featuresRequest = http.expectOne(`${api}/admin/premium-features`);
		if (!featuresRequest.cancelled) {
			featuresRequest.flush({ data: { features: FEATURES } });
		}
		const dialog = await screen.findByRole("dialog", {
			name: "Premium access"
		});
		expect(
			await within(dialog).findByText("Could not load premium access.")
		).toBeInTheDocument();
		expect(
			within(dialog).getByRole("button", { name: "Try again" })
		).toBeInTheDocument();
	});
});
