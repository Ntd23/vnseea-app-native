// Description: Implements the auth repository using the WoWonder backend API.
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import {
  identifyPushUser,
  logoutPushUser,
} from '../../../shared-kernel/infrastructure/push/oneSignalPush';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import {
  connectLiveKitCallRealtime,
  disconnectLiveKitCallRealtime,
} from '../../../messages/infrastructure/realtime/liveKitCallRealtime';
import type { AuthRepository } from '../../domain/repositories/AuthRepository';
import type {
  AuthResult,
  AuthSession,
  AuthUser,
  CurrentUserResult,
  LoginCredentials,
  RegisterInput,
} from '../../domain/types/auth.types';

const AUTH_DEBUG_PREFIX = '[VNSEEA_AUTH_DEBUG]';

type AuthResponse = {
  api_status: number | string;
  access_token?: string;
  user_id?: number | string;
  user_platform?: string;
  membership?: boolean;
  message?: string;
  user_data?: Record<string, unknown>;
  status?: string;
};

type CurrentUserResponse = {
  api_status: number | string;
  user_data?: Record<string, unknown>;
};

const AUTH_DEVICE_TYPE = 'phone';

function authDebugError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return {
    message: String(error),
  };
}

function logAuthDebug(event: string, data: Record<string, unknown> = {}) {
  try {
    console.log(
      AUTH_DEBUG_PREFIX,
      JSON.stringify({
        event,
        at: new Date().toISOString(),
        ...data,
      }),
    );
  } catch (error) {
    console.log(AUTH_DEBUG_PREFIX, event, authDebugError(error));
  }
}

function mapAuthResponse(response: AuthResponse): AuthResult {
  console.log(
    '[ApiAuthRepository] Login response:',
    JSON.stringify(response, null, 2),
  );

  if (response.access_token && response.user_id) {
    const session: AuthSession = {
      accessToken: response.access_token,
      userId: String(response.user_id),
      userPlatform: response.user_platform,
      membershipRequired: Boolean(response.membership),
    };

    sessionStorage.setSession(session);
    identifyPushUser(session.userId);
    connectLiveKitCallRealtime();

    // Save user profile data
    if (response.user_data && typeof response.user_data === 'object') {
      const userData = response.user_data;
      sessionStorage.setUserProfile({
        name: String(userData.name || userData.first_name || ''),
        username: String(userData.username || ''),
        avatarUrl: String(userData.avatar || ''),
      });
    }

    return { status: 'authenticated', session };
  }

  if (response.user_id && response.message) {
    return {
      status: 'verification_required',
      userId: String(response.user_id),
      message: response.message,
    };
  }

  throw new Error(response.message || 'Authentication failed');
}

function mapCurrentUser(
  response: CurrentUserResponse,
): CurrentUserResult | null {
  const userData = response.user_data;
  if (!userData) return null;

  const user: AuthUser = {
    id: String(userData.user_id ?? ''),
    username: String(userData.username || ''),
    name: String(userData.name || ''),
    avatar: String(userData.avatar || ''),
  };

  return { user, sessionHash: String(userData.session_hash || '') };
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
      console.log(
        '[Auth] API login response:',
        JSON.stringify(response, null, 2),
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
          password: input.password.trim(),
          confirm_password: input.confirmPassword.trim(),
          birthday: input.birthday?.trim() || '',
          gender: input.gender || 'male',
          has_existing_storefront: input.hasExistingStorefront ? '1' : '0',
          hasExistingStorefront: input.hasExistingStorefront ? '1' : '0',
          device_type: AUTH_DEVICE_TYPE,
        },
      );
      console.log('[ApiAuthRepository] Register response:', response);
      return mapAuthResponse(response);
    },

    async forgotPassword(input) {
      await apiBridge.post(apiRoutes.auth.forgotPassword, {
        email: input.email.trim(),
      });
    },

    async logout() {
      const activeSession = sessionStorage.getSession();
      const hadAccessToken = Boolean(activeSession?.accessToken);

      logAuthDebug('auth_logout_start', {
        hadAccessToken,
        userId: activeSession?.userId ?? '',
      });

      try {
        if (hadAccessToken) {
          await apiBridge.post(apiRoutes.auth.logout);
          logAuthDebug('auth_logout_backend_success', {
            userId: activeSession?.userId ?? '',
          });
        } else {
          logAuthDebug('auth_logout_backend_skipped', {
            reason: 'missing_access_token',
          });
        }
      } catch (error) {
        logAuthDebug('auth_logout_backend_error', {
          userId: activeSession?.userId ?? '',
          error: authDebugError(error),
        });
        console.warn('[Auth] Backend logout failed; continuing local cleanup', error);
      } finally {
        disconnectLiveKitCallRealtime();
        logoutPushUser();
        sessionStorage.clearSession();
        logAuthDebug('auth_logout_local_cleanup_done', {
          hadAccessToken,
          userId: activeSession?.userId ?? '',
        });
      }
    },

    async getCurrentUser() {
      if (!sessionStorage.getAccessToken()) return null;
      const response = await apiBridge.post<CurrentUserResponse>(
        apiRoutes.auth.me,
      );
      console.log('[ApiAuthRepository] getCurrentUser response:', response);
      return mapCurrentUser(response);
    },

    async fetchUserById(userId: string) {
      if (!userId || !sessionStorage.getAccessToken()) return null;
      const response = await apiBridge.post<CurrentUserResponse>(
        apiRoutes.user.get,
        { user_id: userId, fetch: 'user_data' },
      );
      return mapCurrentUser(response);
    },
  };
}
