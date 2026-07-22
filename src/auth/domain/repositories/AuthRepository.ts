// Description: Declares the auth repository contract used by application view models.
import type {
  AuthResult,
  ConfirmAccountInput,
  CurrentUserResult,
  ForgotPasswordInput,
  LoginCredentials,
  RegisterInput,
} from '../types/auth.types';

export interface AuthRepository {
  login(credentials: LoginCredentials): Promise<AuthResult>;
  register(input: RegisterInput): Promise<AuthResult>;
  confirmAccount(input: ConfirmAccountInput): Promise<AuthResult>;
  resendAccountCode(userId: string): Promise<void>;
  forgotPassword(input: ForgotPasswordInput): Promise<void>;
  logout(): Promise<void>;

  /**
   * Fetch the authenticated viewer's profile.
   *
   * Goes through `/api/get-current-user`, which is NOT deployed on every
   * WoWonder install — prefer `fetchUserById` when you only need display
   * fields (name, avatar) since that uses the standard `/api/get-user-data`
   * endpoint that ships with every install.
   */
  getCurrentUser(): Promise<CurrentUserResult | null>;

  /**
   * Fetch a single user's profile by id.
   *
   * Goes through `/api/get-user-data` (always deployed). Returns the same
   * shape as `getCurrentUser` so the caller can use one or the other
   * interchangeably for display purposes.
   */
  fetchUserById(userId: string): Promise<CurrentUserResult | null>;
}
