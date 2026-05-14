// Description: Defines legacy app route names shared by older screen imports.
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
} as const;

export type RouteName = (typeof ROUTES)[keyof typeof ROUTES];
