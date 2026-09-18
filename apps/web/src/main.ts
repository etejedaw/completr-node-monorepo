import { bootstrapApplication } from "@angular/platform-browser";

import { App } from "./app/app";
import { appConfig } from "./app/app.config";
import { applyInitialTheme } from "./app/core/services/theme";

applyInitialTheme();

bootstrapApplication(App, appConfig).catch(err => console.error(err));
