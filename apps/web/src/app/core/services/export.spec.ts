import {
	HttpHeaders,
	provideHttpClient,
	withInterceptors
} from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../environments/environment";
import { errorInterceptor } from "../interceptors/error.interceptor";
import { AuthService } from "./auth";
import { ExportService, fileNameFromDisposition } from "./export";
import { ToastService } from "./toast";

describe("ExportService", () => {
	let service: ExportService;
	let httpTesting: HttpTestingController;
	const toast = { warning: vi.fn(), premium: vi.fn() };
	const createObjectURL = vi.fn(() => "blob:export");
	const revokeObjectURL = vi.fn();
	let downloads: { href: string; download: string }[];
	let clickSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		toast.warning.mockReset();
		toast.premium.mockReset();
		createObjectURL.mockClear();
		revokeObjectURL.mockClear();
		downloads = [];
		Object.assign(URL, { createObjectURL, revokeObjectURL });
		clickSpy = vi
			.spyOn(HTMLAnchorElement.prototype, "click")
			.mockImplementation(function (this: HTMLAnchorElement) {
				downloads.push({ href: this.href, download: this.download });
			});
		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(withInterceptors([errorInterceptor])),
				provideHttpClientTesting(),
				{
					provide: AuthService,
					useValue: {
						token: () => null,
						refresh: vi.fn(),
						clearSession: vi.fn()
					}
				},
				{ provide: ToastService, useValue: toast }
			]
		});
		service = TestBed.inject(ExportService);
		httpTesting = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpTesting.verify();
		clickSpy.mockRestore();
		Reflect.deleteProperty(URL, "createObjectURL");
		Reflect.deleteProperty(URL, "revokeObjectURL");
	});

	it.each([
		"backlog",
		"queue",
		"game-shelf",
		"wishlist",
		"favorites",
		"platinums"
	] as const)("requests the %s export of the current user", collection => {
		service.download(collection, "csv").subscribe();

		const req = httpTesting.expectOne(
			r => r.url === `${environment.apiUrl}/users/me/${collection}/export`
		);
		expect(req.request.method).toBe("GET");
		expect(req.request.responseType).toBe("blob");
		expect(req.request.params.get("format")).toBe("csv");
		req.flush(new Blob(["a,b"]));
	});

	it("requests the export of a list by id with the json format", () => {
		service.download({ listId: "list-1" }, "json").subscribe();

		const req = httpTesting.expectOne(
			r => r.url === `${environment.apiUrl}/lists/list-1/export`
		);
		expect(req.request.params.get("format")).toBe("json");
		req.flush(new Blob(["{}"]));
	});

	it("downloads the file with the name from Content-Disposition and revokes the url", () => {
		const onDone = vi.fn();
		service.download("backlog", "csv").subscribe({ complete: onDone });

		httpTesting
			.expectOne(r => r.url.endsWith("/users/me/backlog/export"))
			.flush(new Blob(["title\n"], { type: "text/csv" }), {
				headers: new HttpHeaders({
					"Content-Disposition":
						'attachment; filename="completr-backlog-2026-10-27.csv"'
				})
			});

		expect(createObjectURL).toHaveBeenCalledTimes(1);
		expect(downloads).toEqual([
			{ href: "blob:export", download: "completr-backlog-2026-10-27.csv" }
		]);
		expect(revokeObjectURL).toHaveBeenCalledWith("blob:export");
		expect(document.querySelector("a[download]")).toBeNull();
		expect(onDone).toHaveBeenCalled();
	});

	it("falls back to a dated name when the header is missing", () => {
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date(2026, 9, 5, 12));
		service.download({ listId: "list-1" }, "json").subscribe();

		httpTesting
			.expectOne(r => r.url.endsWith("/lists/list-1/export"))
			.flush(new Blob(["{}"]));
		vi.useRealTimers();

		expect(downloads[0].download).toBe("completr-list-2026-10-05.json");
	});

	it("turns a blob error body into JSON so the 402 shows the premium toast", async () => {
		const onError = vi.fn();
		service.download("backlog", "json").subscribe({ error: onError });

		httpTesting
			.expectOne(r => r.url.endsWith("/users/me/backlog/export"))
			.flush(
				new Blob([JSON.stringify({ type: "EXPORT_FORMAT_PREMIUM" })], {
					type: "application/json"
				}),
				{ status: 402, statusText: "Payment Required" }
			);

		await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
		expect(onError.mock.calls[0][0].error).toEqual({
			type: "EXPORT_FORMAT_PREMIUM"
		});
		expect(toast.premium).toHaveBeenCalledWith(
			"Free plan limit",
			expect.stringContaining("JSON export is a Premium perk"),
			6000
		);
		expect(downloads).toEqual([]);
	});
});

describe("fileNameFromDisposition", () => {
	it.each([
		[
			'attachment; filename="completr-queue-2026-10-27.csv"',
			"completr-queue-2026-10-27.csv"
		],
		["attachment; filename=completr-queue.csv", "completr-queue.csv"],
		[
			"attachment; filename=\"fallback.csv\"; filename*=UTF-8''completr%20queue.csv",
			"completr queue.csv"
		]
	])("reads %s", (header, expected) => {
		expect(fileNameFromDisposition(header)).toBe(expected);
	});

	it.each([null, "", "attachment"])("returns null for %s", header => {
		expect(fileNameFromDisposition(header)).toBeNull();
	});
});
