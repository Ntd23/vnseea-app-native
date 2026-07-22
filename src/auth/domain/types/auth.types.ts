// Description: Defines domain types for backend authentication flows.
export type AuthUser = {
  id: string;
  username?: string;
  name?: string;
  email?: string;
  avatar?: string;
};

export type AuthSession = {
  accessToken: string;
  userId: string;
  userPlatform?: string;
  membershipRequired?: boolean;
};

export type LoginCredentials = {
  username: string;
  password: string;
};

export type RegisterInput = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  birthday?: string;
  gender: 'male' | 'female';
  hasExistingStorefront?: boolean;
};

export type ConfirmAccountInput = {
  userId: string;
  code: string;
  timezone?: string;
};

export type ForgotPasswordInput = {
  email: string;
};

export type AuthResult =
  | {
      status: 'authenticated';
      session: AuthSession;
    }
  | {
      status: 'verification_required';
      userId: string;
      message: string;
    };

export type CurrentUserResult = {
  user: AuthUser;
  sessionHash?: string;
};
