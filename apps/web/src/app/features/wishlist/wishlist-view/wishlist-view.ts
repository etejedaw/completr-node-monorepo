import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-wishlist-view',
  template: '<p>Wishlist works!</p>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WishlistView {}
