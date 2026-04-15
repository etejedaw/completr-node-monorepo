import { HttpHandlerFn, HttpRequest } from "@angular/common/http";
import { inject } from "@angular/core";
import { catchError, switchMap, throwError } from "rxjs";
import { AuthService } from "../services/auth.service";

let isRefreshing = false;

export function errorInterceptor(
	req: HttpRequest<unknown>,
	next: HttpHandlerFn
) {
	const auth = inject(AuthService);

	return next(req).pipe(
		catchError(error => {
			if (
				error.status !== 401 ||
				isRefreshing ||
				isAuthRequest(req.url)
			) {
				if (error.status === 401) auth.clearSession();
				return throwError(() => error);
			}

			isRefreshing = true;

			return auth.refresh().pipe(
				switchMap(() => {
					isRefreshing = false;
					const retryReq = req.clone({
						headers: req.headers.set(
							"Authorization",
							`Bearer ${auth.token()}`
						)
					});
					return next(retryReq);
				}),
				catchError(refreshError => {
					isRefreshing = false;
					auth.clearSession();
					return throwError(() => refreshError);
				})
			);
		})
	);
}

function isAuthRequest(url: string): boolean {
	return url.includes("/auth/refresh") || url.includes("/auth/login");
}
