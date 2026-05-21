// Description: Coordinates auth screen state with the auth repository.
import { useCallback, useState } from 'react';
import { createAuthRepository } from '../../infrastructure/repositories/ApiAuthRepository';
import type {
  AuthResult,
  ForgotPasswordInput,
  LoginCredentials,
  RegisterInput,
} from '../../domain/types/auth.types';

const repository = createAuthRepository();

function toErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return String(error);
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

  const logout = useCallback(
    () => runAuthAction(() => repository.logout()),
    [runAuthAction],
  );

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
