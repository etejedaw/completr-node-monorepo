import { Component, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout implements OnInit {
  private readonly auth = inject(AuthService);
  protected readonly user = this.auth.user;

  ngOnInit() {
    if (!this.user()) {
      this.auth.loadUser().subscribe();
    }
  }

  logout() {
    this.auth.logout();
  }
}
