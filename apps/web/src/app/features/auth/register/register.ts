import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-register',
  template: '<p>Register works!</p>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Register {}
