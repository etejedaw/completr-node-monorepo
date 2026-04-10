import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StorageService } from './storage.service';
import { User } from '../models';

const TOKEN_KEY = 'access_token';

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  name: string;
}

interface AuthResponse {
  data: { access_token: string };
}

interface UserResponse {
  data: { user: User };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageService);
  private readonly router = inject(Router);

  private readonly _user = signal<User | null>(null);
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);

  token(): string | null {
    return this.storage.get(TOKEN_KEY);
  }

  login(credentials: LoginRequest) {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials)
      .pipe(tap((res) => this.storage.set(TOKEN_KEY, res.data.access_token)));
  }

  register(data: RegisterRequest) {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/register`, data)
      .pipe(tap((res) => this.storage.set(TOKEN_KEY, res.data.access_token)));
  }

  loadUser() {
    return this.http
      .get<UserResponse>(`${environment.apiUrl}/users/me`)
      .pipe(tap((res) => this._user.set(res.data.user)));
  }

  logout() {
    this.storage.remove(TOKEN_KEY);
    this._user.set(null);
    this.router.navigate(['/login']);
  }
}
