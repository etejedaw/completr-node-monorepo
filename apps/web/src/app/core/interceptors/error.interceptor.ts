import { HttpHandlerFn, HttpRequest } from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { catchError, throwError } from "rxjs";
import { AuthService } from "../services/auth.service";

export function errorInterceptor(
	req: HttpRequest<unknown>,
	next: HttpHandlerFn
) {
	const router = inject(Router);
	const auth = inject(AuthService);

	return next(req).pipe(
		catchError(error => {
			if (error.status === 401) {
				auth.logout();
				router.navigate(["/login"]);
			}
			return throwError(() => error);
		})
	);
}
