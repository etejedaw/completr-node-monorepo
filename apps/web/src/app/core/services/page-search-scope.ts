import { computed, Injectable, signal } from "@angular/core";

import { type PageSearchScopeEntry } from "./page-search-scope.model";

@Injectable()
export class PageSearchScope {
	private readonly activeEntry = signal<PageSearchScopeEntry | null>(null);

	readonly active = this.activeEntry.asReadonly();
	readonly hasScope = computed(() => this.activeEntry() !== null);

	register(entry: PageSearchScopeEntry): () => void {
		this.activeEntry.set(entry);
		return () => {
			if (this.activeEntry() === entry) this.activeEntry.set(null);
		};
	}
}
