// Description: Implements the auth repository using the WoWonder backend API.
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import type { AuthRepository } from '../../domain/repositories/AuthRepository';
import type {
  AuthResult,
  AuthSession,
  AuthUser,
  CurrentUserResult,
  LoginCredentials,
  RegisterInput,
} from '../../domain/types/auth.types';

type AuthResponse = {
  api_status: number | string;
  access_token?: string;
  user_id?: number | string;
  user_platform?: string;
  membership?: boolean;
  message?: string;
  user_data?: Record<string, unknown>;
};

type CurrentUserResponse = {
  api_status: number | string;
  user_data?: Record<string, unknown>;
};

const AUTH_DEVICE_TYPE = 'phone';

function mapAuthResponse(response: AuthResponse): AuthResult {
  if (response.access_token && response.user_id) {
    const session: AuthSession = {
      accessToken: response.access_token,
      userId: String(response.user_id),
      userPlatform: response.user_platform,
      membershipRequired: Boolean(response.membership),
    };

    sessionStorage.setSession(session);

    // Also save user profile data for quick access in Settings and other screens
    if (response.user_data && typeof response.user_data === 'object') {
      const userData = response.user_data as Record<string, unknown>;
      sessionStorage.setUserProfile({
        name: stringField(userData, 'name') || stringField(userData, 'first_name') || '',
        username: stringField(userData, 'username') || '',
        avatarUrl: stringField(userData, 'avatar') || '',
      });
    }

    return {
      status: 'authenticated',
      session,
    };
  }

  if (response.user_id && response.message) {
    return {
      status: 'verification_required',
      userId: String(response.user_id),
      message: response.message,
    };
  }

  throw new Error('Authentication response is missing session data');
}

function stringField(data: Record<string, unknown>, key: string) {
  const value = data[key];
  return typeof value === 'string' ? value : undefined;
}

function mapCurrentUser(
  response: CurrentUserResponse,
): CurrentUserResult | null {
  const userData = response.user_data;

  if (!userData) {
    return null;
  }

  const user: AuthUser = {
    id: String(userData.user_id ?? ''),
    username: stringField(userData, 'username'),
    name: stringField(userData, 'name'),
    email: stringField(userData, 'email'),
    avatar: stringField(userData, 'avatar'),
  };

  return {
    user,
    sessionHash: stringField(userData, 'session_hash'),
  };
}

export function createAuthRepository(): AuthRepository {
  return {
    async login(credentials: LoginCredentials) {
      const response = await apiBridge.post<AuthResponse>(
        apiRoutes.auth.login,
        {
          username: credentials.username.trim(),
          password: credentials.password,
          device_type: AUTH_DEVICE_TYPE,
        },
      );

      return mapAuthResponse(response);
    },

    async register(input: RegisterInput) {
      const response = await apiBridge.post<AuthResponse>(
        apiRoutes.auth.register,
        {
          first_name: input.firstName.trim(),
          last_name: input.lastName.trim(),
          username: input.username.trim(),
          email: input.email.trim(),
          password: input.password,
          confirm_password: input.confirmPassword,
          gender: input.gender,
          device_type: AUTH_DEVICE_TYPE,
        },
      );

      return mapAuthResponse(response);
    },

    async forgotPassword(input) {
      await apiBridge.post(apiRoutes.auth.forgotPassword, {
        email: input.email.trim(),
      });
    },

    async logout() {
      try {
        if (sessionStorage.getAccessToken()) {
          await apiBridge.post(apiRoutes.auth.logout);
        }
      } finally {
        sessionStorage.clearSession();
      }
    },

    async getCurrentUser() {
      if (!sessionStorage.getAccessToken()) {
        return null;
      }

      const response = await apiBridge.post<CurrentUserResponse>(
        apiRoutes.auth.me,
      );

      return mapCurrentUser(response);
    },

    async fetchUserById(userId: string) {
      // ── WoWonder /api/get-user-data contract ──────────────────────────
      // Required POST params:
      //   • user_id  — the user to look up
      //   • fetch    — comma-separated sections to include. We only need
      //                display fields, so `user_data` is enough. Other
      //                values (followers, following, …) trigger extra
      //                queries we don't want to pay for.
      //
      // The response wraps the result the same way `/api/get-current-user`
      // does (`{ api_status, user_data: { user_id, name, avatar, … } }`),
      // so we can route both through the same `mapCurrentUser` helper.
      if (!userId || !sessionStorage.getAccessToken()) {
        return null;
      }

      const response = await apiBridge.post<CurrentUserResponse>(
        apiRoutes.user.get,
        { user_id: userId, fetch: 'user_data' },
      );

      return mapCurrentUser(response);
    },
  };
}
