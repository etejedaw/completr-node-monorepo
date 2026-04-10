import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-login',
  template: '<p>Login works!</p>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {}
