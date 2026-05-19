import { HttpHandlerFn, HttpRequest } from "@angular/common/http";
import { inject } from "@angular/core";
import { catchError, switchMap, throwError } from "rxjs";
import { AuthService } from "../services/auth.service";
import { ToastService } from "../services/toast.service";

let isRefreshing = false;

export function errorInterceptor(
	req: HttpRequest<unknown>,
	next: HttpHandlerFn
) {
	const auth = inject(AuthService);
	const toast = inject(ToastService);

	return next(req).pipe(
		catchError(error => {
			if (error.status === 409) {
				const detail =
					error.error?.detail ??
					error.error?.title ??
					"This action was already performed. Please refresh and try again.";
				toast.warning(detail);
				return throwError(() => error);
			}

			if (error.status === 429) {
				toast.warning(
					"Too many requests. Please wait a moment and try again."
				);
				return throwError(() => error);
			}

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
