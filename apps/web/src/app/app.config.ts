import { provideHttpClient, withInterceptors } from "@angular/common/http";
import {
	type ApplicationConfig,
	inject,
	isDevMode,
	provideAppInitializer,
	provideBrowserGlobalErrorListeners
} from "@angular/core";
import {
	PreloadAllModules,
	provideRouter,
	withPreloading
} from "@angular/router";
import { provideServiceWorker } from "@angular/service-worker";
import { provideToastConfig } from "ng-primitives/toast";
import { catchError, firstValueFrom, of } from "rxjs";

import { routes } from "./app.routes";
import { authInterceptor } from "./core/interceptors/auth.interceptor";
import { errorInterceptor } from "./core/interceptors/error.interceptor";
import { AuthService } from "./core/services/auth";

export const appConfig: ApplicationConfig = {
	providers: [
		provideBrowserGlobalErrorListeners(),
		provideRouter(routes, withPreloading(PreloadAllModules)),
		provideHttpClient(
			withInterceptors([authInterceptor, errorInterceptor])
		),
		provideAppInitializer(() => {
			const auth = inject(AuthService);
			if (!auth.isAccessTokenExpired()) return;
			return firstValueFrom(
				auth.refresh().pipe(catchError(() => of(null)))
			);
		}),
		provideServiceWorker("ngsw-worker.js", {
			enabled: !isDevMode(),
			registrationStrategy: "registerWhenStable:30000"
		}),
		provideToastConfig({
			placement: "bottom-end",
			offsetBottom: 16,
			offsetRight: 16,
			gap: 8,
			maxToasts: 4,
			ariaLive: "polite"
		})
	]
};
