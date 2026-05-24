// Description: Defines typed navigation parameter lists shared across app navigators.
import { ROUTES } from './constants/routes';

export type MainTabParamList = {
  [ROUTES.FEED]: undefined;
  [ROUTES.EXPLORE]: undefined;
  [ROUTES.REELS]: undefined;
  [ROUTES.NOTIFICATIONS]: undefined;
  [ROUTES.SETTINGS]: undefined;
};

export type RootStackParamList = {
  [ROUTES.LOGIN]: undefined;
  [ROUTES.REGISTER]: undefined;
  [ROUTES.FORGOT_PASSWORD]: undefined;
  [ROUTES.MAIN_TABS]: undefined;
  [ROUTES.PROFILE]: undefined;
  [ROUTES.MY_PHOTOS]: undefined;
  [ROUTES.ALBUMS]: undefined;
  [ROUTES.CREATE_ALBUM]: undefined;
  [ROUTES.MY_VIDEOS]: undefined;
  [ROUTES.MESSAGES]: undefined;
  [ROUTES.CALLS]: undefined;
  [ROUTES.SEARCH]: undefined;
  [ROUTES.SEARCH_FILTER]: undefined;
  [ROUTES.SAVED_POSTS]: undefined;
  [ROUTES.SEARCH_EMPTY]: undefined;
  [ROUTES.CREATE_PAGE]: undefined;
  [ROUTES.CREATE_PRODUCT]: undefined;
  [ROUTES.CREATE_EVENT]: undefined;
  [ROUTES.CREATE_GROUP]: undefined;
  [ROUTES.EXPLORE_GROUPS]: undefined;
  [ROUTES.GROUP_DETAIL]: undefined;
  [ROUTES.EVENTS]: undefined;
  [ROUTES.FUNDING]: undefined;
  [ROUTES.FOLLOWING]: undefined;
  [ROUTES.BOOSTED]: undefined;
  [ROUTES.BLOGS]: undefined;
  [ROUTES.BLOG_FILTER_CATEGORY]: undefined;
  [ROUTES.BLOG_DETAIL]: undefined;
  [ROUTES.MOVIES]: undefined;
  [ROUTES.JOBS]: undefined;
  [ROUTES.JOB_DETAIL]: undefined;
  [ROUTES.EARNINGS]: undefined;
  [ROUTES.AFFILIATES]: undefined;
  [ROUTES.INVITE_FRIENDS]: undefined;
  [ROUTES.MY_POINTS]: undefined;
  [ROUTES.WITHDRAWAL]: undefined;
  [ROUTES.MEMORIES]: undefined;
  [ROUTES.OFFERS]: undefined;
  [ROUTES.ADVERTISING]: undefined;
  [ROUTES.CREATE_AD]: undefined;
  [ROUTES.CREATE_REEL]: undefined;
  [ROUTES.CREATE_POST]: undefined;
};

export type MainTabRouteName = keyof MainTabParamList;
export type RootStackRouteName = keyof RootStackParamList;
