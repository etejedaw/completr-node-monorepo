import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { render, screen, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { environment } from "../../../../environments/environment";
import { AdminUsers } from "./admin-users";

const USERS = [
	{
		id: "u1",
		username: "ada",
		email: "ada@example.com",
		name: "Ada Lovelace",
		role: "admin",
		isActive: true,
		profileVisibility: "public",
		createdAt: "2026-01-02T00:00:00.000Z"
	},
	{
		id: "u2",
		username: "bob",
		email: "bob@example.com",
		name: "Bob Builder",
		role: "user",
		isActive: false,
		profileVisibility: "public",
		createdAt: "2026-02-03T00:00:00.000Z"
	}
];

async function renderUsers(users = USERS) {
	const view = await render(AdminUsers, {
		providers: [provideHttpClient(), provideHttpClientTesting()]
	});
	const http = TestBed.inject(HttpTestingController);
	http.expectOne(req => req.url === `${environment.apiUrl}/admin/invitations`).flush({
		data: { invitations: [] }
	});
	http
		.expectOne(req => req.url === `${environment.apiUrl}/admin/users`)
		.flush({ data: { users, total: users.length } });
	view.fixture.detectChanges();
	return { http, ...view };
}

describe("AdminUsers", () => {
	beforeEach(() => {
		vi.stubGlobal("matchMedia", (query: string) => ({
			matches: false,
			media: query,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn()
		}));
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("lists users with their role and status", async () => {
		await renderUsers();
		expect(screen.getAllByText("Ada Lovelace").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Inactive").length).toBeGreaterThan(0);
	});

	it("opens the edit dialog for the clicked user", async () => {
		await renderUsers();
		await userEvent.click(screen.getAllByRole("button", { name: "Edit bob" })[0]!);
		const dialog = await screen.findByRole("dialog", { name: "Edit user" });
		expect(within(dialog).getByLabelText("Name")).toHaveValue("Bob Builder");
	});

	it("opens the create dialog from the hero action", async () => {
		await renderUsers();
		await userEvent.click(screen.getByRole("button", { name: /Create User/ }));
		expect(
			await screen.findByRole("dialog", { name: "Create user" })
		).toBeTruthy();
	});

	it("shows the empty state when there are no users", async () => {
		await renderUsers([]);
		expect(screen.getByText("No users found")).toBeTruthy();
	});
});
