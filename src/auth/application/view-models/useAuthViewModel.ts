// Description: Coordinates auth screen state with the auth repository.
import { useCallback, useState } from 'react';
import { ROUTES } from '../../../navigation/constants/routes';
import { navigationRef } from '../../../navigation/navigationRef';
import { createAuthRepository } from '../../infrastructure/repositories/ApiAuthRepository';
import type {
  AuthResult,
  ForgotPasswordInput,
  LoginCredentials,
  RegisterInput,
} from '../../domain/types/auth.types';

const repository = createAuthRepository();
const AUTH_DEBUG_PREFIX = '[VNSEEA_AUTH_DEBUG]';

function toErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return String(error);
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
  } catch {
    console.log(AUTH_DEBUG_PREFIX, event);
  }
}

function resetNavigationToLogin() {
  if (!navigationRef.isReady()) {
    logAuthDebug('auth_logout_navigation_reset_skipped', {
      reason: 'navigation_not_ready',
    });
    return;
  }

  navigationRef.reset({
    index: 0,
    routes: [{ name: ROUTES.LOGIN }],
  });
  logAuthDebug('auth_logout_navigation_reset');
}

export function useAuthViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordResetSent, setPasswordResetSent] = useState(false);

  const runAuthAction = useCallback(
    async <TResult>(action: () => Promise<TResult>) => {
      setIsLoading(true);
      setError(null);
      setPasswordResetSent(false);

      try {
        return await action();
      } catch (caughtError) {
        const errorMessage = toErrorMessage(caughtError);
        setError(errorMessage);
        throw caughtError;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const login = useCallback(
    (credentials: LoginCredentials): Promise<AuthResult> =>
      runAuthAction(() => repository.login(credentials)),
    [runAuthAction],
  );

  const register = useCallback(
    (input: RegisterInput): Promise<AuthResult> =>
      runAuthAction(() => repository.register(input)),
    [runAuthAction],
  );

  const forgotPassword = useCallback(
    async (input: ForgotPasswordInput) => {
      await runAuthAction(() => repository.forgotPassword(input));
      setPasswordResetSent(true);
    },
    [runAuthAction],
  );

  const logout = useCallback(async () => {
    await runAuthAction(() => repository.logout());
    resetNavigationToLogin();
  }, [runAuthAction]);

  return {
    isLoading,
    error,
    passwordResetSent,
    login,
    register,
    forgotPassword,
    logout,
  };
}
