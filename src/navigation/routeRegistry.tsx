// Description: Centralizes app screen registrations for stack and tab navigators.
import React from 'react';
import { Bell, Hash, Home, PlaySquare, Settings } from 'lucide-react-native';
import { ROUTES } from './constants/routes';
import type { MainTabRouteName, RootStackRouteName } from './types';
import { ForgotPasswordScreen, LoginScreen, RegisterScreen } from '../auth';
import { FeedScreen } from '../feed';
import { ExploreScreen } from '../explore';
import { ReelsScreen } from '../reels';
import { NotificationsScreen } from '../notifications';
import { SettingsScreen } from '../settings';
import {
  BlogDetailScreen,
  BlogFilterCategoryScreen,
  BlogsScreen,
} from '../blogs';
import { BoostedScreen } from '../boosted';
import { CreatePageScreen } from '../pages';
import { CreateProductScreen } from '../market';
import { CreateEventScreen, EventsScreen } from '../events';
import {
  CreateGroupScreen,
  ExploreGroupsScreen,
  FollowingScreen,
  GroupDetailScreen,
} from '../community';
import { FundingScreen } from '../funding';
import { MoviesScreen } from '../movies';
import { JobDetailScreen, JobsScreen } from '../jobs';
import { ProfileScreen } from '../profile';
import { AlbumsScreen, CreateAlbumScreen, MyPhotosScreen } from '../photos';
import { MyVideosScreen } from '../videos';
import { CallScreen, MessageScreen } from '../messages';
import { SearchEmptyScreen, SearchFilterScreen, SearchScreen } from '../search';
import { SavedPostsScreen } from '../saved';
import {
  AffiliatesScreen,
  EarningsScreen,
  InviteFriendsScreen,
  MyPointsScreen,
} from '../wallet';
import { WithdrawalScreen } from '../withdrawal';

type ScreenComponent = React.ComponentType<any>;
type TabIconComponent = React.ComponentType<{
  size: number;
  color: string;
  strokeWidth: number;
}>;

export type StackRouteDefinition = {
  name: RootStackRouteName;
  component: ScreenComponent;
};

export type TabRouteDefinition = {
  name: MainTabRouteName;
  component: ScreenComponent;
  Icon: TabIconComponent;
  accessibilityLabel: string;
  isCenter?: boolean;
};

export const TAB_ROUTES: TabRouteDefinition[] = [
  {
    name: ROUTES.FEED,
    component: FeedScreen,
    Icon: Home,
    accessibilityLabel: 'Feed',
  },
  {
    name: ROUTES.EXPLORE,
    component: ExploreScreen,
    Icon: Hash,
    accessibilityLabel: 'Hashtags',
  },
  {
    name: ROUTES.REELS,
    component: ReelsScreen,
    Icon: PlaySquare,
    accessibilityLabel: 'Reels',
    isCenter: true,
  },
  {
    name: ROUTES.NOTIFICATIONS,
    component: NotificationsScreen,
    Icon: Bell,
    accessibilityLabel: 'Notifications',
  },
  {
    name: ROUTES.SETTINGS,
    component: SettingsScreen,
    Icon: Settings,
    accessibilityLabel: 'Settings',
  },
];

export function createStackRoutes(
  MainTabsComponent: ScreenComponent,
): StackRouteDefinition[] {
  return [
    { name: ROUTES.LOGIN, component: LoginScreen },
    { name: ROUTES.REGISTER, component: RegisterScreen },
    { name: ROUTES.FORGOT_PASSWORD, component: ForgotPasswordScreen },
    { name: ROUTES.MAIN_TABS, component: MainTabsComponent },
    { name: ROUTES.PROFILE, component: ProfileScreen },
    { name: ROUTES.MY_PHOTOS, component: MyPhotosScreen },
    { name: ROUTES.ALBUMS, component: AlbumsScreen },
    { name: ROUTES.CREATE_ALBUM, component: CreateAlbumScreen },
    { name: ROUTES.MY_VIDEOS, component: MyVideosScreen },
    { name: ROUTES.MESSAGES, component: MessageScreen },
    { name: ROUTES.CALLS, component: CallScreen },
    { name: ROUTES.SEARCH, component: SearchScreen },
    { name: ROUTES.SEARCH_FILTER, component: SearchFilterScreen },
    { name: ROUTES.SAVED_POSTS, component: SavedPostsScreen },
    { name: ROUTES.SEARCH_EMPTY, component: SearchEmptyScreen },
    { name: ROUTES.CREATE_PAGE, component: CreatePageScreen },
    { name: ROUTES.CREATE_PRODUCT, component: CreateProductScreen },
    { name: ROUTES.CREATE_EVENT, component: CreateEventScreen },
    { name: ROUTES.CREATE_GROUP, component: CreateGroupScreen },
    { name: ROUTES.EXPLORE_GROUPS, component: ExploreGroupsScreen },
    { name: ROUTES.GROUP_DETAIL, component: GroupDetailScreen },
    { name: ROUTES.EVENTS, component: EventsScreen },
    { name: ROUTES.FUNDING, component: FundingScreen },
    { name: ROUTES.FOLLOWING, component: FollowingScreen },
    { name: ROUTES.BOOSTED, component: BoostedScreen },
    { name: ROUTES.BLOGS, component: BlogsScreen },
    { name: ROUTES.BLOG_FILTER_CATEGORY, component: BlogFilterCategoryScreen },
    { name: ROUTES.BLOG_DETAIL, component: BlogDetailScreen },
    { name: ROUTES.MOVIES, component: MoviesScreen },
    { name: ROUTES.JOBS, component: JobsScreen },
    { name: ROUTES.JOB_DETAIL, component: JobDetailScreen },
    { name: ROUTES.EARNINGS, component: EarningsScreen },
    { name: ROUTES.AFFILIATES, component: AffiliatesScreen },
    { name: ROUTES.INVITE_FRIENDS, component: InviteFriendsScreen },
    { name: ROUTES.MY_POINTS, component: MyPointsScreen },
    { name: ROUTES.WITHDRAWAL, component: WithdrawalScreen },
  ];
}
