import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../../environments/environment";
import { SUPPRESS_VALIDATION_TOAST } from "../../../shared/utils/validation-errors";
import { AuditService } from "./audit.service";
import { InvitationAdminService } from "./invitation-admin.service";
import { JobsService } from "./jobs.service";
import { ReportsService } from "./reports.service";
import { UserAdminService } from "./user-admin.service";

describe("admin services", () => {
	const api = environment.apiUrl;
	let httpTesting: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpTesting.verify();
	});

	describe("AuditService", () => {
		it("requests the audit log with default pagination and unwraps the data", () => {
			const data = { logs: [{ id: "l1" }], total: 1 };
			let result: unknown;

			TestBed.inject(AuditService)
				.getAuditLog()
				.subscribe(r => (result = r));

			const req = httpTesting.expectOne(
				r => r.url === `${api}/admin/audit`
			);
			expect(req.request.method).toBe("GET");
			expect(req.request.params.get("limit")).toBe("50");
			expect(req.request.params.get("offset")).toBe("0");
			expect(req.request.params.has("action")).toBe(false);
			req.flush({ data });
			expect(result).toEqual(data);
		});

		it("adds the action and target type filters when provided", () => {
			TestBed.inject(AuditService)
				.getAuditLog(10, 30, { action: "ban", targetType: "user" })
				.subscribe();

			const req = httpTesting.expectOne(
				r => r.url === `${api}/admin/audit`
			);
			expect(req.request.params.get("limit")).toBe("10");
			expect(req.request.params.get("offset")).toBe("30");
			expect(req.request.params.get("action")).toBe("ban");
			expect(req.request.params.get("targetType")).toBe("user");
			req.flush({ data: { logs: [], total: 0 } });
		});
	});

	describe("InvitationAdminService", () => {
		let service: InvitationAdminService;

		beforeEach(() => {
			service = TestBed.inject(InvitationAdminService);
		});

		it("creates an invitation and returns it", () => {
			const invitation = { id: "i1", email: "a@b.c" };
			let result: unknown;

			service.invite("a@b.c").subscribe(r => (result = r));

			const req = httpTesting.expectOne(`${api}/admin/invitations`);
			expect(req.request.method).toBe("POST");
			expect(req.request.body).toEqual({ email: "a@b.c" });
			req.flush({ data: { invitation } });
			expect(result).toEqual(invitation);
		});

		it("lists the invitations", () => {
			let result: unknown;

			service.list().subscribe(r => (result = r));

			const req = httpTesting.expectOne(`${api}/admin/invitations`);
			expect(req.request.method).toBe("GET");
			req.flush({ data: { invitations: [{ id: "i1" }] } });
			expect(result).toEqual([{ id: "i1" }]);
		});

		it("revokes an invitation by id", () => {
			service.revoke("i1").subscribe();

			const req = httpTesting.expectOne(`${api}/admin/invitations/i1`);
			expect(req.request.method).toBe("DELETE");
			req.flush(null);
		});
	});

	describe("JobsService", () => {
		let service: JobsService;

		beforeEach(() => {
			service = TestBed.inject(JobsService);
		});

		it("lists the jobs", () => {
			let result: unknown;

			service.getJobs().subscribe(r => (result = r));

			const req = httpTesting.expectOne(`${api}/admin/jobs`);
			expect(req.request.method).toBe("GET");
			req.flush({ data: { jobs: [{ id: "j1" }] } });
			expect(result).toEqual([{ id: "j1" }]);
		});

		it("starts the RAWG population without a limit by default", () => {
			let result: unknown;

			service.startPopulateRawg().subscribe(r => (result = r));

			const req = httpTesting.expectOne(
				`${api}/admin/jobs/populate-rawg`
			);
			expect(req.request.method).toBe("POST");
			req.flush({ data: { job: { id: "j1" } } });
			expect(result).toEqual({ id: "j1" });
		});

		it("passes the limit as a query string when starting the RAWG population", () => {
			service.startPopulateRawg(25).subscribe();

			httpTesting
				.expectOne(`${api}/admin/jobs/populate-rawg?limit=25`)
				.flush({ data: { job: { id: "j1" } } });
		});

		it.each([
			["startCalculateRatings", "calculate-ratings"],
			["startCalculateDurations", "calculate-durations"]
		] as const)(
			"%s posts to the %s job and returns the job",
			(method, path) => {
				let result: unknown;

				service[method]().subscribe(r => (result = r));

				const req = httpTesting.expectOne(`${api}/admin/jobs/${path}`);
				expect(req.request.method).toBe("POST");
				req.flush({ data: { job: { id: "j2" } } });
				expect(result).toEqual({ id: "j2" });
			}
		);

		it("cancels a job by id", () => {
			service.cancelJob("j1").subscribe();

			const req = httpTesting.expectOne(`${api}/admin/jobs/j1`);
			expect(req.request.method).toBe("DELETE");
			req.flush(null);
		});
	});

	describe("ReportsService", () => {
		let service: ReportsService;

		beforeEach(() => {
			service = TestBed.inject(ReportsService);
		});

		it("lists the pending reports", () => {
			let result: unknown;

			service.getPendingReports().subscribe(r => (result = r));

			const req = httpTesting.expectOne(`${api}/admin/game-reports`);
			expect(req.request.method).toBe("GET");
			req.flush({ data: { reports: [{ id: "r1" }] } });
			expect(result).toEqual([{ id: "r1" }]);
		});

		it("patches the report status and returns the updated report", () => {
			let result: unknown;

			service
				.updateReportStatus("r1", "approved")
				.subscribe(r => (result = r));

			const req = httpTesting.expectOne(`${api}/admin/game-reports/r1`);
			expect(req.request.method).toBe("PATCH");
			expect(req.request.body).toEqual({ status: "approved" });
			req.flush({ data: { report: { id: "r1", status: "approved" } } });
			expect(result).toEqual({ id: "r1", status: "approved" });
		});
	});

	describe("UserAdminService", () => {
		let service: UserAdminService;

		beforeEach(() => {
			service = TestBed.inject(UserAdminService);
		});

		it("creates a user suppressing the automatic validation toast", () => {
			const body = {
				username: "ada",
				email: "a@b.c",
				password: "secret",
				name: "Ada"
			};
			let result: unknown;

			service.createUser(body).subscribe(r => (result = r));

			const req = httpTesting.expectOne(`${api}/admin/users`);
			expect(req.request.method).toBe("POST");
			expect(req.request.body).toEqual(body);
			expect(req.request.context.get(SUPPRESS_VALIDATION_TOAST)).toBe(
				true
			);
			req.flush({ data: { user: { id: "u1" } } });
			expect(result).toEqual({ id: "u1" });
		});

		it("lists users with default pagination and returns users and total", () => {
			const data = { users: [{ id: "u1" }], total: 1 };
			let result: unknown;

			service.listUsers().subscribe(r => (result = r));

			const req = httpTesting.expectOne(
				r => r.url === `${api}/admin/users`
			);
			expect(req.request.method).toBe("GET");
			expect(req.request.params.get("limit")).toBe("50");
			expect(req.request.params.get("offset")).toBe("0");
			req.flush({ data });
			expect(result).toEqual(data);
		});

		it("lists users with custom pagination", () => {
			service.listUsers(5, 10).subscribe();

			const req = httpTesting.expectOne(
				r => r.url === `${api}/admin/users`
			);
			expect(req.request.params.get("limit")).toBe("5");
			expect(req.request.params.get("offset")).toBe("10");
			req.flush({ data: { users: [], total: 0 } });
		});

		it("edits a user suppressing the automatic validation toast", () => {
			let result: unknown;

			service
				.editUser("u1", { role: "admin", isActive: false })
				.subscribe(r => (result = r));

			const req = httpTesting.expectOne(`${api}/admin/users/u1`);
			expect(req.request.method).toBe("PATCH");
			expect(req.request.body).toEqual({
				role: "admin",
				isActive: false
			});
			expect(req.request.context.get(SUPPRESS_VALIDATION_TOAST)).toBe(
				true
			);
			req.flush({ data: { user: { id: "u1", role: "admin" } } });
			expect(result).toEqual({ id: "u1", role: "admin" });
		});
	});
});
