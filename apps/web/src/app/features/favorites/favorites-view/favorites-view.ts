import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
	selector: "app-favorites-view",
	template: "<p>Favorites works!</p>",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class FavoritesView {}
