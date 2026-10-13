import {
	ChangeDetectionStrategy,
	Component,
	inject,
	signal
} from "@angular/core";
import { injectDialogRef } from "ng-primitives/dialog";

import { UiButton, UiDialog } from "../../../shared/ui";
import {
	WishlistPlatformChoice,
	type WishlistPlatformOption
} from "../components/wishlist-platform-choice";
import { WishlistService } from "../wishlist";

export interface WishlistPlatformModalData {
	gameId: string;
	gameTitle: string;
	platforms: WishlistPlatformOption[];
}
export type WishlistPlatformModalResult = "saved";

@Component({
	selector: "app-wishlist-platform-modal",
	imports: [UiButton, UiDialog, WishlistPlatformChoice],
	templateUrl: "./wishlist-platform-modal.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class WishlistPlatformModal {
	private readonly wishlistService = inject(WishlistService);
	private readonly dialogRef = injectDialogRef<
		WishlistPlatformModalData,
		WishlistPlatformModalResult
	>();
	protected readonly gameId = this.dialogRef.data.gameId;
	protected readonly gameTitle = this.dialogRef.data.gameTitle;
	protected readonly platforms = this.dialogRef.data.platforms;

	protected readonly selectedPlatformId = signal<string | null>(null);
	protected readonly saving = signal(false);

	confirm(skipPlatform = false) {
		if (this.saving()) return;
		this.saving.set(true);
		const platformId = skipPlatform
			? undefined
			: (this.selectedPlatformId() ?? undefined);
		this.wishlistService.add(this.gameId, platformId).subscribe({
			next: () => {
				this.saving.set(false);
				this.dialogRef.close("saved");
			},
			error: () => this.saving.set(false)
		});
	}

	onClose() {
		this.dialogRef.close();
	}
}
