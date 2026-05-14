// Description: Defines app route names shared by navigation screens.
export const ROUTES = {
  LOGIN: 'Login',
  REGISTER: 'Register',
  FORGOT_PASSWORD: 'ForgotPassword',
  MAIN_TABS: 'MainTabs',
  FEED: 'Feed',
  EXPLORE: 'Explore',
  REELS: 'Reels',
  NOTIFICATIONS: 'Notifications',
  CREATE_PAGE: 'CreatePage',
  SETTINGS: 'Settings',
  EARNINGS: 'Earnings',
  AFFILIATES: 'Affiliates',
  INVITE_FRIENDS: 'InviteFriends',
  MY_POINTS: 'MyPoints',
  WITHDRAWAL: 'Withdrawal',
} as const;

export type RouteName = (typeof ROUTES)[keyof typeof ROUTES];
