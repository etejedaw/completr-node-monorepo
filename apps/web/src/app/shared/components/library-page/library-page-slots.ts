import { Directive, inject, TemplateRef } from "@angular/core";

@Directive({ selector: "[appLibraryPageToolbar]" })
export class LibraryPageToolbar {
	readonly template = inject<TemplateRef<void>>(TemplateRef);
}

@Directive({ selector: "[appLibraryPageEmptyAction]" })
export class LibraryPageEmptyAction {
	readonly template = inject<TemplateRef<void>>(TemplateRef);
}

@Directive({ selector: "[appLibraryPageContent]" })
export class LibraryPageContent {
	readonly template = inject<TemplateRef<void>>(TemplateRef);
}
