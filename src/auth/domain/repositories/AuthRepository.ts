// Description: Declares the auth repository contract used by application view models.
import type {
  AuthResult,
  CurrentUserResult,
  ForgotPasswordInput,
  LoginCredentials,
  RegisterInput,
} from '../types/auth.types';

export interface AuthRepository {
  login(credentials: LoginCredentials): Promise<AuthResult>;
  register(input: RegisterInput): Promise<AuthResult>;
  forgotPassword(input: ForgotPasswordInput): Promise<void>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<CurrentUserResult | null>;
}
