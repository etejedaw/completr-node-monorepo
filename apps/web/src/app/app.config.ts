import {
	ApplicationConfig,
	provideBrowserGlobalErrorListeners,
	isDevMode
} from "@angular/core";
import { provideRouter } from "@angular/router";
import { provideHttpClient, withInterceptors } from "@angular/common/http";

import { routes } from "./app.routes";
import { authInterceptor } from "./core/interceptors/auth.interceptor";
import { errorInterceptor } from "./core/interceptors/error.interceptor";
import { provideServiceWorker } from "@angular/service-worker";
import { provideToastConfig } from "ng-primitives/toast";

export const appConfig: ApplicationConfig = {
	providers: [
		provideBrowserGlobalErrorListeners(),
		provideRouter(routes),
		provideHttpClient(
			withInterceptors([authInterceptor, errorInterceptor])
		),
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
